# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "RepoNexus" [level=1] [ref=e9]
    - navigation [ref=e10]:
      - button "Dashboard" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - generic [ref=e14]: Dashboard
      - button "Settings" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
        - generic [ref=e19]: Settings
    - generic [ref=e20]:
      - paragraph [ref=e21]: Connected as
      - paragraph [ref=e22]: deesatzed
  - main [ref=e23]:
    - generic [ref=e24]:
      - heading "Configuration" [level=2] [ref=e25]
      - button "Refresh repositories" [active] [ref=e27] [cursor=pointer]:
        - img [ref=e28]
    - generic [ref=e31]:
      - heading "Access Credentials" [level=3] [ref=e32]
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: GitHub Username
          - textbox "GitHub Username" [ref=e36]:
            - /placeholder: e.g. deesatzed
            - text: deesatzed
        - generic [ref=e37]:
          - generic [ref=e38]: Personal Access Token (classic)
          - textbox "Personal Access Token (classic)" [ref=e39]:
            - /placeholder: ghp_xxxxxxxxxxxx
          - paragraph [ref=e40]: Ensure 'repo' scope is selected for private access. Stored locally only.
        - generic [ref=e41]:
          - button "Save Config" [ref=e42] [cursor=pointer]
          - button "Cancel" [ref=e43] [cursor=pointer]
```