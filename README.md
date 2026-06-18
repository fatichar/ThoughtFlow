# ThoughtFlow

ThoughtFlow is a tool for creating playable reasoning flows. A flow should feel like a guided conversation: the viewer reads a card, makes a choice or follows a next step, and moves through a visible path.

## Creating Good Flows

Start with one clear question or decision. Each card should do one job: ask, explain, or conclude with optional next steps. Keep titles short, keep body text focused, and make every choice feel like something a real viewer might think or do.

A strong flow usually has:

- One obvious start node.
- Short cards that are easy to scan.
- Choices that represent meaningful branches, not tiny wording differences.
- Information cards that clarify ideas before asking the next question.
- Conclusion cards that summarize where a path landed and, when useful, offer next steps.

## Node Types

### Question

Use a `question` node when the viewer needs to choose between different answers, beliefs, preferences, or situations.

Questions are the main branching nodes. They should usually have two to four choices.

Good for:

- Starting a flow.
- Splitting the path by opinion or context.
- Asking a viewer to test consistency.
- Moving from a broad topic into more specific branches.

Example:

```text
Title: Do you ever feel depressed?
Text: Choose the answer that feels closest right now.
Choices:
- No
- Yes
```

### Information

Use an `information` node when the viewer needs context before continuing. Information nodes do not ask for a belief directly, but they can offer continuation paths.

Use them to slow the flow down, explain a concept, or bridge from one question to the next.

Good for:

- Definitions.
- Evidence or background.
- Framing a tradeoff.
- Transitional cards between major decisions.

Example:

```text
Title: Available alternatives
Text: When alternatives meet the same need, the choice becomes less about survival and more about preference.
Continue paths:
- So consistency becomes the key question
- That changes the weight of preference
```

### Conclusion

Use a `conclusion` node when a branch has reached a meaningful endpoint. It should summarize the path, not introduce a new branch.

Conclusion nodes can be simple endings or endings with CTA buttons. Use CTA buttons when there is a useful link, resource, signup, download, or recommended next step. Do not use conclusion nodes as ordinary branching cards.

Good for:

- Summarizing the outcome of a branch.
- Naming a practical takeaway.
- Ending a reflection path.
- Linking to relevant resources.
- Offering concrete next steps.

Example:

```text
Title: A practical conclusion
Text: If unnecessary harm is avoidable, reducing it becomes a consistent way to act on that reasoning.
CTA buttons:
- Try the 7-day challenge: https://example.com/challenge
- Read more: https://example.com
```

## Choosing The Right Node

Use this quick rule:

- If the viewer must decide, use `question`.
- If the viewer needs context, use `information`.
- If the path has reached an answer or needs next-step links, use `conclusion`.

## Choice Guidelines

Choices should describe the viewer's intent, not the author's label for a branch.

Prefer:

```text
No, taste alone is not enough
```

Over:

```text
Go to necessity branch
```

Keep choices parallel when possible. If one choice is a full sentence, the others should usually be full sentences too.

## CTA Guidelines

CTA buttons need both a label and a URL. Use clear labels that tell the viewer what will happen.

Prefer:

```text
Watch the documentary
```

Over:

```text
Click here
```

Use `primary` for the most important CTA on a conclusion node. Use `secondary` for supporting links.

## Flow Structure Checklist

Before publishing, check that:

- The start node is the intended first card.
- Every question has meaningful choices.
- Every choice points to another node.
- Information nodes continue the path clearly.
- Conclusion nodes use CTAs for links and next steps.
- No node title is blank.
- The path can be played without dead ends unless the dead end is intentional.
- The final card gives the viewer a satisfying sense of closure.

## Writing Style

Use simple, direct language. ThoughtFlow works best when each card feels like a thoughtful prompt, not a lecture.

Good cards are:

- Short enough to read quickly.
- Specific enough to move the viewer forward.
- Honest about uncertainty.
- Calm in tone, especially for sensitive topics.

If a card feels crowded, split it into an information node followed by a question node.
