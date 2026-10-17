import Lake
open Lake DSL

package «duper-experiment» where
  leanOptions := #[
    ⟨`autoImplicit, false⟩,
    ⟨`relaxedAutoImplicit, false⟩
  ]

require duper from git
  "https://github.com/leanprover-community/duper.git" @ "v0.0.18"

@[default_target]
lean_lib «DuperTest» where
