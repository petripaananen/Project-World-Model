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
PWM Neuro-Symbolic Auto-Formalizer & Constraint Verifier (Layer 4)
=================================================================

Translates natural language and tabular project constraints into
structured algebraic/logical predicates and verifies proposal compliance
deterministically at Gate 2b of the Layer 4 Retain Firewall.

Constraint Types:
1. PRECEDENCE: Temporal order t_A + d_A <= t_B
2. CAPACITY_LIMIT: Resource / budget cap sum(r_i) <= R_max
3. MUTUAL_EXCLUSION: Concurrent conflict not(A and B)
4. STATE_INVARIANT: Boundary condition s_env in SafeRegion
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from pwm.ingestion.models import ResolutionProposal, ResolutionStrategy


class ConstraintType(str, Enum):
    PRECEDENCE = "precedence"              # Temporal: Task A before Task B
    CAPACITY_LIMIT = "capacity_limit"      # Resource/budget ceiling: sum(r_i) <= R_max
    MUTUAL_EXCLUSION = "mutual_exclusion"  # Incompatibility: not(A and B)
    STATE_INVARIANT = "state_invariant"    # Environmental or safety requirement


class SymbolicConstraint(BaseModel):
    """Structured algebraic/logical predicate representation."""
    constraint_id: str
    constraint_type: ConstraintType
    description: str
    target_entities: List[str] = Field(default_factory=list)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    predicate_formula: str = ""


class ConstraintVerificationResult(BaseModel):
    """Verification outcome of symbolic evaluation."""
    is_sat: bool = True
    violated_constraints: List[SymbolicConstraint] = Field(default_factory=list)
    counterexamples: List[str] = Field(default_factory=list)

    @property
    def counterexample_trace(self) -> str:
        if self.is_sat or not self.counterexamples:
            return "All symbolic constraints SATISFIED (SAT)."
        return "UNSAT Counterexample:\n" + "\n".join(f"- {c}" for c in self.counterexamples)


class ConstraintAutoFormalizer:
    """
    Translates raw constraint strings (natural language or structured rules)
    into formal predicates and deterministically evaluates proposal execution plans.
    """

    def __init__(self, constraints: Optional[List[SymbolicConstraint]] = None):
        self.constraints: List[SymbolicConstraint] = constraints or []

    def formalize_rules(self, raw_rules: List[str]) -> List[SymbolicConstraint]:
        """
        Parses natural language and semi-structured rules into SymbolicConstraint objects.
        """
        formalized: List[SymbolicConstraint] = []

        for idx, rule in enumerate(raw_rules):
            rule_clean = rule.strip()
            rule_lower = rule_clean.lower()
            cid = f"c_{idx + 1}"

            # 1. Temporal Precedence Patterns: "A must precede B", "A before B", "A -> B", "cure >= N"
            if "->" in rule_clean or "before" in rule_lower or "precede" in rule_lower or "after" in rule_lower:
                if "->" in rule_clean:
                    parts = [p.strip() for p in rule_clean.split("->")]
                    src = parts[0].replace("precedence:", "").strip()
                    dst = parts[1].strip()
                elif "before" in rule_lower:
                    match = re.search(r"(.+?)\s+(?:must\s+)?(?:be\s+)?(?:completed\s+)?before\s+(.+)", rule_clean, re.I)
                    src = match.group(1).strip() if match else "task_A"
                    dst = match.group(2).strip() if match else "task_B"
                elif "precede" in rule_lower:
                    match = re.search(r"(.+?)\s+(?:must\s+)?(?:precede|precedes)\s+(.+)", rule_clean, re.I)
                    src = match.group(1).strip() if match else "task_A"
                    dst = match.group(2).strip() if match else "task_B"
                elif "after" in rule_lower:
                    match = re.search(r"(.+?)\s+(?:can\s+only\s+start|starts)?\s+after\s+(.+)", rule_clean, re.I)
                    dst = match.group(1).strip() if match else "task_B"
                    src = match.group(2).strip() if match else "task_A"
                else:
                    src, dst = "task_A", "task_B"

                formalized.append(
                    SymbolicConstraint(
                        constraint_id=cid,
                        constraint_type=ConstraintType.PRECEDENCE,
                        description=rule_clean,
                        target_entities=[src.lower(), dst.lower()],
                        parameters={"predecessor": src.lower(), "successor": dst.lower()},
                        predicate_formula=f"t({src}) + duration({src}) <= t({dst})",
                    )
                )

            # 2. Capacity Limit / Budget Patterns: "capacity <= N", "budget <= N", "limit <= N", "max N"
            elif any(k in rule_lower for k in ["<=", "<", "max", "limit", "budget", "capacity", "ceiling", "cap"]):
                limit_val = 100.0
                match = re.search(r"(\d+(?:\.\d+)?)", rule_clean)
                if match:
                    limit_val = float(match.group(1))

                entity = "resource"
                if "hour" in rule_lower or "effort" in rule_lower:
                    entity = "hours"
                elif "budget" in rule_lower or "$" in rule_clean or "usd" in rule_lower or "cost" in rule_lower:
                    entity = "budget_usd"
                elif "crane" in rule_lower:
                    entity = "crane_hours"

                formalized.append(
                    SymbolicConstraint(
                        constraint_id=cid,
                        constraint_type=ConstraintType.CAPACITY_LIMIT,
                        description=rule_clean,
                        target_entities=[entity],
                        parameters={"entity": entity, "max_limit": limit_val},
                        predicate_formula=f"sum({entity}) <= {limit_val}",
                    )
                )

            # 3. Mutual Exclusion Patterns: "not both", "exclusive", "cannot simultaneously", "mutex"
            elif any(k in rule_lower for k in ["exclusive", "not concurrent", "cannot simultaneously", "mutex", "mutually"]):
                parts = re.split(r"and|with|concurrently", rule_clean, flags=re.I)
                entities = [p.strip().lower() for p in parts if len(p.strip()) > 1]
                formalized.append(
                    SymbolicConstraint(
                        constraint_id=cid,
                        constraint_type=ConstraintType.MUTUAL_EXCLUSION,
                        description=rule_clean,
                        target_entities=entities[:2],
                        parameters={"entities": entities[:2]},
                        predicate_formula=f"not (active({entities[0] if entities else 'A'}) and active({entities[1] if len(entities) > 1 else 'B'}))",
                    )
                )

            # 4. State Invariant / Safety
            else:
                formalized.append(
                    SymbolicConstraint(
                        constraint_id=cid,
                        constraint_type=ConstraintType.STATE_INVARIANT,
                        description=rule_clean,
                        target_entities=[],
                        parameters={"raw": rule_clean},
                        predicate_formula=f"invariant({rule_clean}) == True",
                    )
                )

        self.constraints.extend(formalized)
        return formalized

    def verify_proposal(
        self,
        proposal: ResolutionProposal,
        active_constraints: Optional[List[SymbolicConstraint]] = None,
    ) -> ConstraintVerificationResult:
        """
        Deterministically evaluates proposal strategies against formal constraints.
        Checks:
          1. Temporal ordering of steps (precedence satisfaction).
          2. Resource / effort capacity bounds.
          3. Mutual exclusion between concurrently active operations.
        """
        rules_to_check = active_constraints if active_constraints is not None else self.constraints
        if not rules_to_check:
            return ConstraintVerificationResult(is_sat=True)

        rec_idx = max(0, min(proposal.recommended_strategy_index, len(proposal.strategies) - 1)) if proposal.strategies else 0
        strategy: Optional[ResolutionStrategy] = proposal.strategies[rec_idx] if proposal.strategies else None

        violated: List[SymbolicConstraint] = []
        counterexamples: List[str] = []

        # Aggregate strategy properties
        strategy_text = ""
        steps_ordered: List[str] = []
        total_effort = 0.0

        if strategy:
            strategy_text = f"{strategy.title} {strategy.description}".lower()
            steps_ordered = [s.lower() for s in strategy.steps]
            total_effort = strategy.estimated_effort_hours

        for c in rules_to_check:
            # 1. Check PRECEDENCE
            if c.constraint_type == ConstraintType.PRECEDENCE:
                pred = c.parameters.get("predecessor", "")
                succ = c.parameters.get("successor", "")
                if pred and succ and steps_ordered:
                    # Find step indices matching predecessor and successor keywords
                    pred_idx = next((i for i, step in enumerate(steps_ordered) if any(w in step for w in pred.split())), None)
                    succ_idx = next((i for i, step in enumerate(steps_ordered) if any(w in step for w in succ.split())), None)

                    if pred_idx is not None and succ_idx is not None:
                        if pred_idx > succ_idx:
                            # Predecessor was scheduled AFTER successor! Inverted precedence violation!
                            violated.append(c)
                            counterexamples.append(
                                f"Precedence violation [{c.constraint_id}]: '{succ}' is scheduled at step {succ_idx + 1} "
                                f"before its required predecessor '{pred}' at step {pred_idx + 1}. "
                                f"Formula: t({pred}) + d({pred}) <= t({succ}) is FALSE."
                            )

            # 2. Check CAPACITY_LIMIT
            elif c.constraint_type == ConstraintType.CAPACITY_LIMIT:
                max_lim = c.parameters.get("max_limit", 100.0)
                entity = c.parameters.get("entity", "")
                if entity in ["hours", "crane_hours", "budget_usd"] and total_effort > max_lim:
                    violated.append(c)
                    counterexamples.append(
                        f"Capacity limit violation [{c.constraint_id}]: Proposal requires {total_effort:.1f} hours, "
                        f"which exceeds the ceiling of {max_lim:.1f} hours. "
                        f"Formula: sum({entity}) <= {max_lim} is FALSE (delta: +{total_effort - max_lim:.1f})."
                    )

            # 3. Check MUTUAL_EXCLUSION
            elif c.constraint_type == ConstraintType.MUTUAL_EXCLUSION:
                entities = c.parameters.get("entities", [])
                if len(entities) >= 2:
                    e1, e2 = entities[0], entities[1]
                    # If both mutually exclusive actions occur in the same strategy
                    e1_in = any(e1 in step for step in steps_ordered) or (e1 in strategy_text)
                    e2_in = any(e2 in step for step in steps_ordered) or (e2 in strategy_text)
                    if e1_in and e2_in:
                        violated.append(c)
                        counterexamples.append(
                            f"Mutual exclusion violation [{c.constraint_id}]: Actions '{e1}' and '{e2}' "
                            f"are concurrently scheduled. Formula: not (active({e1}) and active({e2})) is FALSE."
                        )

        return ConstraintVerificationResult(
            is_sat=len(violated) == 0,
            violated_constraints=violated,
            counterexamples=counterexamples,
        )
