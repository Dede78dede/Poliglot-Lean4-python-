import Duper

-- Test 1: First-order equality reasoning
theorem duper_eq_trans (a b c : Nat) (h1 : a = b) (h2 : b = c) : a = c := by
  duper [h1, h2]

-- Test 2: Propositional logic resolution
theorem duper_modus_ponens (P Q : Prop) (h1 : P → Q) (h2 : P) : Q := by
  duper [h1, h2]
