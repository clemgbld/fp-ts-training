// `fp-ts` training Exercise 2
// Let's have fun with combinators!

import { Either } from 'fp-ts/Either';
import { Option } from 'fp-ts/Option';
import { Failure } from '../Failure';
import { filterMap } from 'fp-ts/lib/ReadonlyArray';
import { either, option } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function';

///////////////////////////////////////////////////////////////////////////////
//                                   SETUP                                   //
///////////////////////////////////////////////////////////////////////////////

// We are developping a small game, and the player can control either one of
// three types of characters, mainly differentiated by the type of damage they
// can put out.

// Our main `Character` type is a simple union of all the concrete character
// types.
export type Character = Warrior | Wizard | Archer;

// We have three types of `Damage`, each corresponding to a character type.
export enum Damage {
  Physical = 'Physical damage',
  Magical = 'Magical damage',
  Ranged = 'Ranged damage',
}

// A `Warrior` only can output physical damage.
export class Warrior {
  smash() {
    return Damage.Physical;
  }

  toString() {
    return 'Warrior';
  }
}

// A `Wizard` only can output magical damage.
export class Wizard {
  burn() {
    return Damage.Magical;
  }

  toString() {
    return 'Wizard';
  }
}

// An `Archer` only can output ranged damage.
export class Archer {
  shoot() {
    return Damage.Ranged;
  }

  toString() {
    return 'Archer';
  }
}

// We also have convenient type guards to help us differentiate between
// character types when given a `Character`.

export const isWarrior = (character: Character): character is Warrior => {
  return (character as Warrior).smash !== undefined;
};

export const isWizard = (character: Character): character is Wizard => {
  return (character as Wizard).burn !== undefined;
};

export const isArcher = (character: Character): character is Archer => {
  return (character as Archer).shoot !== undefined;
};

// Finally, we have convenient and expressive error types, defining what can
// go wrong in our game:
// - the player can try to perform an action with no character targeted
// - the player can try to perform the wrong action for a character class

export enum Exo2FailureType {
  NoTarget = 'Exo2FailureType_NoTarget',
  InvalidTarget = 'Exo2FailureType_InvalidTarget',
}

export type NoTargetFailure = Failure<Exo2FailureType.NoTarget>;
export const noTargetFailure = Failure.builder(Exo2FailureType.NoTarget);

export type InvalidTargetFailure = Failure<Exo2FailureType.InvalidTarget>;
export const invalidTargetFailure = Failure.builder(
  Exo2FailureType.InvalidTarget,
);

///////////////////////////////////////////////////////////////////////////////
//                                  EITHER                                   //
///////////////////////////////////////////////////////////////////////////////

// The next three functions take the unit currently targeted by the player and
// return the expected damage type if appropriate.
//
// If no unit is selected, it should return
// `either.left(noTargetFailure('No unit currently selected'))`
//
// If a unit of the wrong type is selected, it should return
// `either.left(invalidTargetFailure('<unit_type> cannot perform <action>'))`
//
// Otherwise, it should return `either.right(<expected_damage_type>)`
//
// HINT: These functions represent the public API. But it is heavily
// recommended to break those down into smaller private functions that can be
// reused instead of doing one big `pipe` for each.
//
// HINT: `Either` has a special constructor `fromPredicate` that can accept
// a type guard such as `isWarrior` to help with type inference.
//
// HINT: Sequentially check for various possible errors is one of the most
// common operations done with the `Either` type and it is available through
// the `chain` operator and its slightly relaxed variant `chainW`.

export const checkTargetAndSmash: (
  target: Option<Character>,
) => Either<NoTargetFailure | InvalidTargetFailure, Damage> = (
  target: Option<Character>,
) =>
  pipe(
    target,
    either.fromOption(() => noTargetFailure('No unit currently selected')),
    either.chainW(t =>
      either.fromPredicate(isWarrior, () =>
        invalidTargetFailure(`${t.toString()} cannot perform smash`),
      )(t),
    ),
    either.chain(t => either.right(t.smash())),
  );

export const checkTargetAndBurn: (
  target: Option<Character>,
) => Either<NoTargetFailure | InvalidTargetFailure, Damage> = (
  target: Option<Character>,
) =>
  pipe(
    target,
    either.fromOption(() => noTargetFailure('No unit currently selected')),
    either.chainW(t =>
      either.fromPredicate(isWizard, () =>
        invalidTargetFailure(`${t.toString()} cannot perform burn`),
      )(t),
    ),
    either.chain(t => either.right(t.burn())),
  );

export const checkTargetAndShoot: (
  target: Option<Character>,
) => Either<NoTargetFailure | InvalidTargetFailure, Damage> = (
  target: Option<Character>,
) =>
  pipe(
    target,
    either.fromOption(() => noTargetFailure('No unit currently selected')),
    either.chainW(t =>
      either.fromPredicate(isArcher, () =>
        invalidTargetFailure(`${t.toString()} cannot perform shoot`),
      )(t),
    ),
    either.chain(t => either.right(t.shoot())),
  );

///////////////////////////////////////////////////////////////////////////////
//                                  OPTION                                   //
///////////////////////////////////////////////////////////////////////////////

// The next three function take a `Character` and optionally return the
// expected damage type if the unit matches the expected character type.
//
// HINT: These functions represent the public API. But it is heavily
// recommended to break those down into smaller private functions that can be
// reused instead of doing one big `pipe` for each.
//
// HINT: `Option` has a special constructor `fromEither` that discards the
// error type.
//
// BONUS POINTS: If you properly defined small private helpers in the previous
// section, they should be easily reused for those use-cases.

export const smashOption: (character: Character) => Option<Damage> = (
  character: Character,
) => option.fromEither(checkTargetAndSmash(option.some(character)));

export const burnOption: (character: Character) => Option<Damage> = (
  character: Character,
) => option.fromEither(checkTargetAndBurn(option.some(character)));

export const shootOption: (character: Character) => Option<Damage> = (
  character: Character,
) => option.fromEither(checkTargetAndShoot(option.some(character)));

///////////////////////////////////////////////////////////////////////////////
//                                   ARRAY                                   //
///////////////////////////////////////////////////////////////////////////////

// We now want to aggregate all the attacks of a selection of arbitrarily many
// units and know how many are Physical, Magical or Ranged.
//
// HINT: You should be able to reuse the attackOption variants defined earlier
//
// HINT: `ReadonlyArray` from `fp-ts` has a neat `filterMap` function that
// perform mapping and filtering at the same time by applying a function
// of type `A => Option<B>` over the collection.

export interface TotalDamage {
  [Damage.Physical]: number;
  [Damage.Magical]: number;
  [Damage.Ranged]: number;
}

export const attack: (army: ReadonlyArray<Character>) => TotalDamage = (
  army: ReadonlyArray<Character>,
) => ({
  [Damage.Physical]: filterMap(smashOption)(army).length,
  [Damage.Magical]: filterMap(burnOption)(army).length,
  [Damage.Ranged]: filterMap(shootOption)(army).length,
});
