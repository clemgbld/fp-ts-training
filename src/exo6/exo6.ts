// `fp-ts` training Exercise 6
// Introduction to `ReaderTaskEither`

import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { Application } from './application';
import { User } from './domain';
import { pipe } from 'fp-ts/lib/function';
import { rte } from '../readerTaskEither';
import { taskEither } from 'fp-ts';

// In real world applications you will mostly manipulate `ReaderTaskEither` aka
// `rte` in the use-cases of the application.
// `Reader` -> For dependency injection
// `Task` -> For async operation
// `Either` -> For computations that may fail
//
// Keep in Mind, A ReaderTaskEither is nothing more than a Reader of a Task of an Either
// type ReaderTaskEither<Env, Error, Value> = Reader<Env, Task<Either<Error, Value>>>
//
// The ReaderTaskEither module from fp-ts gives us some useful methods to manipulate it.
// You will learn the usage of the most common in the following usecases.

// In the following usecase, you will learn the usage of `rte.map()`.
// `rte.map()` allows you to perform an operation on the values stored in the
// current context. In the following example, we need to fetch a user by its id
// and then we want to return its capitalized.

const capitalized = (word: string): string =>
  `${word[0].toUpperCase()}${word.slice(1)}`;

const capitalizedUserName = ({ name }: User.User) => capitalized(name);

export const getCapitalizedUserName: (args: {
  userId: string;
}) => ReaderTaskEither<
  User.Repository.Access,
  User.Repository.UserNotFoundError,
  string
> = ({ userId }) =>
  pipe(
    rte.ask<User.Repository.Access>(),
    rte.chain(deps => rte.fromTaskEither(deps.userRepository.getById(userId))),
    rte.map(capitalizedUserName),
  );

// Sometimes you will need to get multiple data before performing an operation
// on them. In this case, it is very convenient to use the `Do` notation.
//
// The `Do` notation allows you to enrich the context step-by-step by binding
// the result of an effect (in this case a RTE) to a named variable using
// `rte.apS` or `rte.apSW`.
//
// For example:
// pipe(
//  rte.Do,
//  rte.apS('myDataOne', DataSource.getById(x)),
//  ...
// )

const getUserById = (userId: string) => (deps: User.Repository.Access) =>
  deps.userRepository.getById(userId);

const concatAndThenCapitalized: ({
  user1,
  user2,
}: {
  user1: User.User;
  user2: User.User;
}) => string = ({ user1, user2 }) =>
  capitalizedUserName(user1) + capitalizedUserName(user2);

export const getConcatenationOfTheTwoUserNames: (args: {
  userIdOne: string;
  userIdTwo: string;
}) => ReaderTaskEither<
  User.Repository.Access,
  User.Repository.UserNotFoundError,
  string
> = ({ userIdOne, userIdTwo }) =>
  pipe(
    rte.Do,
    rte.apS('user1', getUserById(userIdOne)),
    rte.apS('user2', getUserById(userIdTwo)),
    rte.map(concatAndThenCapitalized),
  );

// Sometimes, you will need to feed the current context with data that you can
// only retrieve after performing some operations, in other words, operations
// need to be sequential.
// For example, if you want to fetch the best friend of a user you will have to
// fetch the first user and then fetch its best friend.
// In this case, we will use `rte.bindW()` to use data of the current context
// (the firstly fetched user) to perform a second operation (fetch its best friend)
// and bind the return value to feed the context and use those data.

export const getConcatenationOfTheBestFriendNameAndUserName: (args: {
  userIdOne: string;
}) => ReaderTaskEither<
  User.Repository.Access,
  User.Repository.UserNotFoundError,
  string
> = ({ userIdOne }) =>
  pipe(
    rte.Do,
    rte.apS('user1', getUserById(userIdOne)),
    rte.bindW('user2', ({ user1 }) => getUserById(user1.bestFriendId)),
    rte.map(concatAndThenCapitalized),
  );

// Most of the time, you will need to use several external services.
// The challenge of this usecase is to use TimeService in the flow of our `rte`
type Dependencies = User.Repository.Access & Application.TimeService.Access;

export const getConcatenationOfUserNameAndCurrentYear: (args: {
  userIdOne: string;
}) => ReaderTaskEither<
  Dependencies,
  User.Repository.UserNotFoundError,
  string
> = ({ userIdOne }) =>
  pipe(
    rte.Do,
    rte.apS('user1', (deps: Dependencies) =>
      deps.userRepository.getById(userIdOne),
    ),
    rte.apS('thisYear', ({ timeService }) =>
      taskEither.of(timeService.thisYear()),
    ),
    rte.map(({ user1, thisYear }) => `${user1.name}${thisYear}`),
  );
