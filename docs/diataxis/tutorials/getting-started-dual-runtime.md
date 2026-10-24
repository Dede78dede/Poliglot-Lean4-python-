# Tutorial: Getting Started with Dual-Runtime Development

**Goal**: In this tutorial, you will write a numerical algorithm in Python 3.14 (running locally via Pyodide WebAssembly) and establish a certified Lean 4 formal specification for it.

---

## Prerequisites
- A modern web browser with WebAssembly support (Chrome, Firefox, Safari, Edge).
- No server installation or local compilers required.

---

## Step 1: Open the Workbench & Select Python Runtime

1. Launch Polyglot Code Studio in your browser.
2. In the top status bar or via the Command Palette (`Ctrl+K`), ensure the active language is set to **Python**:
   - Press `Ctrl+K`
   - Type `language python` and press `Enter`.
3. Notice the status bar indicator updates to `Pyodide Ready · Python 3.14 (WASM)`.

---

## Step 2: Implement an Empirical Witness

In the main editor window, type or paste the following Python function computing the greatest common divisor:

```python
def gcd(a: int, b: int) -> int:
    while b != 0:
        a, b = b, a % b
    return abs(a)

# Quick verification test
assert gcd(48, 18) == 6
print(f"gcd(48, 18) = {gcd(48, 18)}")
```

Press `Ctrl+Enter` or click **Run Code** in the menu.  
The terminal output dock will display:
```
gcd(48, 18) = 6
Execution completed in 4.2ms (Exit 0)
```

---

## Step 3: Switch to Lean 4 Formal Specification

Now we will state and formally verify the property that `gcd(a, b)` divides both `a` and `b`.

1. Press `Ctrl+K`, type `language lean4`, and press `Enter`.
2. Enter the corresponding Lean 4 declaration:

```lean
import Mathlib.Data.Nat.GCD.Basic

theorem nat_gcd_dvd_both (a b : Nat) :
  (Nat.gcd a b ∣ a) ∧ (Nat.gcd a b ∣ b) := by
  constructor
  · exact Nat.gcd_dvd_left a b
  · exact Nat.gcd_dvd_right a b
```

3. Press `Ctrl+Enter` to send the term to the Lean 4 verification engine.
4. The status bar will show a green badge: `Verified by Lean 4 Kernel (Zero sorry)`.

---

## Step 4: Using Automated Proof Repair

If you encounter an unproven goal (`sorry`):
1. Click the **Sparkles** icon in the top right to open the **Proof Automation Panel**.
2. Navigate to the **Auto-Prove (Duper/Aesop)** tab.
3. Click **Run Auto-Prove**.
4. The system executes the superposition and inductive tactic fallback chain. Once synthesized, click **Inject Proof**.

Congratulations! You have completed your first dual-runtime verification workflow in Polyglot Code Studio.
