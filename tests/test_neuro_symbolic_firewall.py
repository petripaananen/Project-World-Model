# Copyright 2026 Petri Paananen
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Tests for Neuro-Symbolic Auto-Formalizer & Constraint Firewall (Phase 4)
========================================================================

Verifies that project constraints (temporal precedence, capacity ceilings,
and mutual exclusions) are auto-formalized and deterministically evaluated
at Gate 2b of the Layer 4 RSI Retain Gate Firewall, triggering RETAIN_VETOED
with explicit counterexamples upon violation.
"""

from __future__ import annotations

import unittest

from pwm.config import PWMConfig
from pwm.analysis.constraint_formalizer import (
    ConstraintAutoFormalizer,
    ConstraintType,
    SymbolicConstraint,
)
from pwm.ingestion.models import (
    CriticVerdict,
    CriticVerdictStatus,
    DebtSeverity,
    ResolutionProposal,
    ResolutionStrategy,
    RetainGateStatus,
)
from pwm.layers.layer4_validation import Layer4Validation


class TestNeuroSymbolicFirewall(unittest.TestCase):

    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.formalizer = ConstraintAutoFormalizer()
        self.l4 = Layer4Validation(self.config)

    def test_auto_formalizer_parses_rules(self):
        """Verify natural language constraint translation into formal predicates."""
        raw_rules = [
            "foundation pour must precede framing erection",
            "crane capacity <= 40 hours",
            "mutually exclusive: excavation and foundation_pour",
        ]
        formalized = self.formalizer.formalize_rules(raw_rules)
        self.assertEqual(len(formalized), 3)

        # Precedence check
        self.assertEqual(formalized[0].constraint_type, ConstraintType.PRECEDENCE)
        self.assertIn("t(", formalized[0].predicate_formula)

        # Capacity check
        self.assertEqual(formalized[1].constraint_type, ConstraintType.CAPACITY_LIMIT)
        self.assertEqual(formalized[1].parameters.get("max_limit"), 40.0)

        # Mutex check
        self.assertEqual(formalized[2].constraint_type, ConstraintType.MUTUAL_EXCLUSION)
        self.assertIn("not (", formalized[2].predicate_formula)

    def test_precedence_violation_triggers_unsat_and_counterexample(self):
        """
        Verify that a proposal executing a successor before its predecessor
        returns UNSAT with a minimal counterexample trace.
        """
        rules = self.formalizer.formalize_rules(["foundation must be completed before framing"])

        # Inverted schedule: framing is step 1, foundation is step 2!
        bad_strategy = ResolutionStrategy(
            title="Inverted Schedule Strategy",
            description="Attempt to erect framing before foundation cures.",
            steps=[
                "Erect structural framing and steel columns",
                "Pour concrete foundation slab",
            ],
            risk_level=DebtSeverity.CRITICAL,
            estimated_effort_hours=20.0,
            predicted_risk=0.40,
        )
        proposal = ResolutionProposal(
            strategies=[bad_strategy],
            recommended_strategy_index=0,
        )

        result = self.formalizer.verify_proposal(proposal, active_constraints=rules)
        self.assertFalse(result.is_sat)
        self.assertEqual(len(result.violated_constraints), 1)
        self.assertIn("Precedence violation", result.counterexample_trace)
        self.assertIn("framing", result.counterexample_trace)
        self.assertIn("foundation", result.counterexample_trace)

    def test_capacity_cap_violation_triggers_unsat(self):
        """Verify that exceeding resource capacity or effort ceilings returns UNSAT."""
        rules = self.formalizer.formalize_rules(["effort hours <= 16.0"])

        over_budget_strategy = ResolutionStrategy(
            title="Over-capacity Refactor",
            description="Massive rebuild requiring excessive hours.",
            steps=["Full manual rewrite of entire legacy module"],
            risk_level=DebtSeverity.MEDIUM,
            estimated_effort_hours=48.0,  # 48 > 16 ceiling!
            predicted_risk=0.30,
        )
        proposal = ResolutionProposal(
            strategies=[over_budget_strategy],
            recommended_strategy_index=0,
        )

        result = self.formalizer.verify_proposal(proposal, active_constraints=rules)
        self.assertFalse(result.is_sat)
        self.assertIn("Capacity limit violation", result.counterexample_trace)
        self.assertIn("48.0 hours", result.counterexample_trace)

    def test_gate_2b_vetoes_proposal_with_counterexample(self):
        """
        Verify that a proposal violating a formal constraint is vetoed at Gate 2b
        (RETAIN_VETOED) with an explicit counterexample in the RetainGateReport.
        """
        rules = ["foundation must precede framing"]

        strategy = ResolutionStrategy(
            title="Fast Track Build",
            description="Run framing first to hit marketing deadline.",
            steps=[
                "Erect framing",
                "Pour foundation",
            ],
            risk_level=DebtSeverity.HIGH,
            estimated_effort_hours=10.0,
            predicted_risk=0.35,
        )
        proposal = ResolutionProposal(
            strategies=[strategy],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Strategy seems well scoped.",
            architectural_integrity_score=0.90,
            strategic_dishonesty_detected=False,
        )

        # Apply Layer 4 Retain Gate with active rules
        proposals, verdicts = self.l4.apply_retain_gate(
            proposals=[proposal],
            verdicts=[verdict],
            constraints=rules,
        )

        # Gate 2b must veto the approval
        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.RETAIN_VETOED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.FAILED_CONSTRAINT)
        self.assertFalse(verdicts[0].retain_gate_report.symbolic_sat)
        self.assertIsNotNone(verdicts[0].retain_gate_report.symbolic_counterexample)
        self.assertIn("Precedence violation", verdicts[0].retain_gate_report.symbolic_counterexample)
        self.assertIn("[🛑 RSI Retain Gate Veto]", verdicts[0].critique)

    def test_compliant_proposal_passes_gate_2b(self):
        """Verify that a proposal satisfying all constraints passes Gate 2b."""
        rules = ["foundation must precede framing", "hours <= 30.0"]

        compliant_strategy = ResolutionStrategy(
            title="Compliant Construction",
            description="Correct temporal ordering.",
            steps=[
                "Pour foundation and cure concrete",
                "Erect framing atop cured slab",
            ],
            risk_level=DebtSeverity.LOW,
            estimated_effort_hours=24.0,  # 24 <= 30
            predicted_risk=0.20,
        )
        proposal = ResolutionProposal(
            strategies=[compliant_strategy],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Everything compliant.",
            architectural_integrity_score=0.95,
            strategic_dishonesty_detected=False,
        )

        proposals, verdicts = self.l4.apply_retain_gate(
            proposals=[proposal],
            verdicts=[verdict],
            constraints=rules,
        )

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.APPROVED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.PASSED)
        self.assertTrue(verdicts[0].retain_gate_report.symbolic_sat)
        self.assertIsNone(verdicts[0].retain_gate_report.symbolic_counterexample)
