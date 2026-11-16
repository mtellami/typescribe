# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gloomtype.spec.ts >> Gloomtype E2E >> toolbar shows practice mode selector
- Location: tests/e2e/gloomtype.spec.ts:37:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic:
  - main [aria-hidden]:
    - generic:
      - heading [level=1]: Gloomtype
    - generic:
      - generic:
        - heading [level=2]: Type along with the video.
        - paragraph: Paste a YouTube link or pick a video, then type each caption as it plays.
        - button: Select a video
      - list:
        - listitem:
          - button:
            - generic:
              - paragraph: Fixture Video
              - paragraph: Gloomtype Tests
    - textbox [disabled]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e6] [cursor=pointer]
  - alert
  - dialog "Select a video" [ref=e11]:
    - heading "Select a video" [level=2] [ref=e13]
    - generic [ref=e14]:
      - text: Paste a YouTube link
      - generic [ref=e15]:
        - textbox "Paste a YouTube link" [active] [ref=e16]:
          - /placeholder: https://www.youtube.com/watch?v=...
        - button "Import" [disabled]
      - status [ref=e17]
    - list [ref=e19]:
      - listitem [ref=e20]:
        - button [ref=e21]:
          - generic [ref=e23]:
            - paragraph [ref=e24]: Fixture Video
            - paragraph [ref=e25]: Gloomtype Tests
    - button "Close" [ref=e27]
    - button "Close" [ref=e28]
```