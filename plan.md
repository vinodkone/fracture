# Fracture - Bill Splitting App Plan

## Overview
A minimal Splitwise-like bill splitting app built with Next.js and JSON file storage.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Storage**: JSON files (easy to swap for real DB later)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Testing**: Jest (unit/integration), Playwright (e2e)

## Implementation Progress

### Phase 1: Foundation ✅
- [x] Initialize Next.js + TypeScript + Tailwind
- [x] Create types in `src/types/index.ts`
- [x] Set up JSON file DB layer in `src/lib/db/`
- [x] Create empty data files in `data/`

### Phase 2: APIs ✅
- [x] Members API (CRUD)
- [x] Groups API (CRUD + add/remove members)
- [x] Expenses API (CRUD)
- [x] Settlements API (CRUD)
- [x] Balances API endpoint

### Phase 3: Core Algorithms ✅
- [x] Balance calculation (`src/lib/algorithms/balance.ts`)
- [x] Debt simplification (`src/lib/algorithms/simplify.ts`)

### Phase 4: UI Components ✅
- [x] Button, Card, Input, Select components
- [x] GroupCard component
- [x] ExpenseList component
- [x] BalanceList component

### Phase 5: Pages 🚧 IN PROGRESS
- [x] Home page (redirect to groups)
- [x] Groups list page
- [ ] Create group page
- [ ] Group detail page (expenses + balances)
- [ ] Add expense page
- [ ] Settle up page

### Phase 6: Testing 📋 PENDING
- [x] Unit tests for algorithms (15 tests passing)
- [ ] Integration tests for APIs
- [ ] End-to-end tests with Playwright

### Phase 7: Polish 📋 PENDING
- [ ] Error handling & validation
- [ ] Loading states
- [ ] Responsive design

## Data Model

```typescript
interface Member { id, name, createdAt }
interface Group { id, name, memberIds[], createdAt }
interface Expense { id, groupId, description, amount, paidByMemberId, splitBetweenMemberIds[], createdAt }
interface Settlement { id, groupId, fromMemberId, toMemberId, amount, createdAt }
```

**Key decision**: Store amounts in cents (integers) to avoid floating-point issues.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home (redirect to groups)
│   ├── groups/
│   │   ├── page.tsx                # List groups
│   │   ├── new/page.tsx            # Create group
│   │   └── [groupId]/
│   │       ├── page.tsx            # Group detail (expenses, balances)
│   │       ├── expenses/new/page.tsx
│   │       └── settle/page.tsx
│   └── api/
│       ├── members/route.ts
│       ├── groups/[groupId]/route.ts
│       ├── groups/[groupId]/balances/route.ts
│       ├── expenses/route.ts
│       └── settlements/route.ts
├── components/
│   ├── ui/                         # Button, Card, Input, etc.
│   └── features/                   # GroupCard, ExpenseForm, BalanceList, etc.
├── lib/
│   ├── db/                         # JSON file CRUD operations
│   └── algorithms/
│       ├── balance.ts              # Calculate net balances
│       └── simplify.ts             # Debt simplification
└── types/index.ts
data/
├── members.json
├── groups.json
├── expenses.json
└── settlements.json
```

## Debt Simplification Algorithm

**Greedy Net Balance approach** (O(n log n)):

1. Calculate net balance for each member (total paid - total owed)
2. Separate into creditors (positive) and debtors (negative)
3. Sort both by amount descending
4. Greedily match largest debtor to largest creditor until settled

**Example**: Alice paid $60, Bob paid $30, Charlie paid $0 (all split 3 ways)
- Net: Alice +$30, Bob $0, Charlie -$30
- Result: Charlie pays Alice $30 (1 transaction)

## Verification Checklist

1. **Create a group** with 3 members (Alice, Bob, Charlie)
2. **Add expenses**:
   - Alice pays $60 for dinner, split 3 ways
   - Bob pays $30 for coffee, split 3 ways
3. **Check balances**: Alice +$30, Bob $0, Charlie -$30
4. **Verify simplified debts**: Charlie → Alice $30
5. **Record settlement**: Charlie pays Alice $30
6. **Verify all balances are $0**
