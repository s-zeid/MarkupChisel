# Markup`Chisel` Test Document

1. **Hello** _world_!  Miss Spelled missspelled a word.
2. `This is code`, ~~strikethrough~~, ^superscript^, ~subscript~, &amp; [H~2~O][water]

[water]: https://en.wikipedia.org/wiki/H₂O "The Universal Solvent™"

> The quick brown fox \
> jumps over the lazy :dog:.

[This] [HR](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr)
[should be] gray:

* * * *

![test image](data:image/svg+xml,...   "title")
Standalone URL links:  <https://example.com/> https://example.net/
[![test linked image](data:image/svg+xml,...)](https://example.org/  "title")

## Headings

Heading 1
=========
Heading 2
---------
<!-- (Setext headings should be monospace) -->

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

## Code blocks

```typescript
let identifier: string = "hello\tworld";  // hello world
```

```
all of these code blocks should be monospace
[tab]	x
00000000x
```

    including this one

```html
and
<u>this</u> one
```

```markdown
## and also... **wat?**
```

```tex
% this should not be highlighted with the lite bundle
```

<div>HTML block</div>

## GFM blocks

| Hello: | Monospace? |
| ------ | ---------- |
| World. |  **Only**  |

* [ ] todo
* [x] completed
* [X] _**REALLY**_ completed
