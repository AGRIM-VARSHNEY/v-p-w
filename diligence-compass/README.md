# Diligence Compass

**Which unknown in this deal is worth resolving next, and what is it worth to know before signing?**

Deal models answer "what's the return?" Data platforms answer "what are the comps?" AI tools summarise the data room. None of them tell a deal team **where to spend the next week of diligence**. Diligence Compass does that, in money terms.

You tag each deal assumption with how sure you are of it (High / Medium / Low, plus a source note). The compass then:

1. **Simulates the deal** thousands of times (entry → hold → exit, with debt paydown), drawing every unverified assumption from a range set by its confidence tag, and firing yes-or-no risks at their stated chance.
2. **Values every outcome at your hurdle rate**, so each simulated world says whether investing at this price beat passing.
3. **Ranks the unknowns by value of information**: how much better, on average, your invest-or-pass call would be if you knew that one unknown before signing. This is the *expected value of partial perfect information* (EVPPI). It is standard for prioritising research in health economics and oil exploration, and as far as we know no other private equity tool uses it.
4. **Turns the ranking into a diligence queue**: the flip point for each unknown ("below 15.1% growth, the deal stops clearing your hurdle; your own range gives that a 56% chance"), what the check costs against what it is worth, and a concrete next step.
5. **Writes the dissent case**: a pre-mortem of the worst 10% of outcomes, showing which assumptions and risks they have in common.
6. **Shows what you have to believe**: the level each assumption must reach for your target multiple and for money back, with the odds of that on your own range.
7. **Sets a walk-away price**: the entry multiple at which the deal exactly meets your hurdle on average.
8. **Exports a Markdown diligence plan** for the IC memo, and a JSON deal file the team can share.

## Run it

It is a static page with no build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server --directory diligence-compass 8000
```

Then open <http://localhost:8000>. Everything runs in the browser and nothing is sent anywhere. Your last deal is saved in your own browser's local storage.

## Test it

```bash
node --test diligence-compass/test/*.test.js
```

The suite checks the returns model against hand calculations, checks that the value bridge sums to exit equity, and checks that the walk-away price gives zero expected value. It also checks that irrelevant assumptions are flagged as noise, and that the fast regression estimate of EVPPI matches a brute-force nested Monte Carlo (within 4% on the sample deal).

## Files

| File | What it is |
|---|---|
| `engine.js` | The model, Monte Carlo, value-of-information maths, pre-mortem and thresholds. Pure functions; runs in the browser and in Node. |
| `app.js` | The interface: input ledger, diligence queue, charts, export and import. |
| `index.html` | Page structure and styles. Light and dark themes. |
| `test/engine.test.js` | Node test suite (`node:test`, no packages). |

## Method, briefly

- **Confidence → range.** Each tag sets a P10–P90 band. On growth, High is ±2 points, Medium ±5 and Low ±10. On the exit multiple, High is ±0.75x, Medium ±1.5x and Low ±3x. A typed range overrides the tag and can be lopsided (a split normal with the base case as median).
- **Correlation.** Revenue growth and the exit multiple can move together (default 0.3), because the same market drives both.
- **Decision value.** `NPV = equity at exit / (1 + hurdle)^years − equity cheque`. Investing beats passing when the average NPV is above zero.
- **EVPPI.** For each assumption, deal NPV is regressed on that assumption (cubic least squares). The fitted values estimate `E[NPV | assumption]`, and `EVPPI = E[max(fitted, 0)] − max(E[NPV], 0)`. For yes-or-no risks the two conditional means are exact. This follows the regression approach of Strong, Oakley & Brennan (2014, *Medical Decision Making*). Values inside simulation noise, or below 0.1% of the equity cheque, show as ≈ 0.
- **A ceiling, not a forecast.** Perfect information is an upper bound on what any real diligence check can be worth. Compare it with the check's cost.

## What the model leaves out

- No interim dividends, recaps or add-ons; one exit at the end of the hold.
- Debt is sized in turns of headline EBITDA and swept with free cash flow; the interest tax shield is ignored.
- Risks hit at exit, with revenue effects phased in over the hold; one-off cash costs add to net debt at exit.
- Equity is floored at zero (limited liability).

## The sample deal

*Project Kestrel* is made up. It is a fictional mid-market buyout of a specialty packaging maker, priced in ₹ crore, and exists only to show how the tool works. It is not a real company or transaction.
