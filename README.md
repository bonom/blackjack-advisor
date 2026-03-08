# Blackjack Advisor

=========

A modern, responsive Blackjack Advisor and Expected Value (EV) calculator built with Next.js and React.

## Purpose

This project was built to study the importance of Expected Value (EV) in games of chance, specifically Blackjack. By calculating the exact probability of every possible dealer outcome and analyzing the expected return of each player action (Stand, Hit, Double Down, Split, Insurance), this tool demonstrates how mathematical advantage can be leveraged at the table.

## Features

- **Multi-Hand Support:** Track up to 5 hands simultaneously, accurately representing a full table.
- **Real-Time EV Calculation:** Instantly calculates the Expected Value for every possible action based on the exact composition of the remaining shoe.
- **Information Advantage:** Uses the collective information of all visible player hands and the dealer's upcard to provide mathematically perfect advice.
- **Card Counting Integration:** Built-in Shoe Tracker calculates the Running Count, True Count (Hi-Lo system), and exact remaining card frequencies to suggest bet sizing.
- **Per-Hand Win Probabilities:** Visualizes the likelihood of each hand winning, pushing, or losing against the dealer.
- **Customizable:** Adjustable number of decks (1-8) and persistent shoe tracking across rounds.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Testing

To run the unit tests:

```bash
npm test
```

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0.
You are free to use, modify, and distribute this software for non-commercial purposes. See the `LICENSE` file for details.
