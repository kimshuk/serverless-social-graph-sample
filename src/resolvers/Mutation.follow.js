import { runtime, util } from "@aws-appsync/utils";

export function request(ctx) {
  if (ctx.identity.username === ctx.args.userId) {
    runtime.earlyReturn(false);
  }

  const sk = `FOLLOWS_${ctx.args.userId}`;
  const now = util.time.nowISO8601();

  return {
    version: "2018-05-29",
    operation: "TransactWriteItems",
    transactItems: [
      {
        table: "#RelationshipsTable#",
        operation: "PutItem",
        key: util.dynamodb.toMapValues({
          userId: ctx.identity.username,
          sk
        }),
        attributeValues: util.dynamodb.toMapValues({
          otherUserId: ctx.args.userId,
          createdAt: now
        }),
        condition: { expression: "attribute_not_exists(sk)" }
      },
      {
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
        update: {
          expression: "ADD followingCount :one",
          expressionValues: util.dynamodb.toMapValues({ ":one": 1 })
        },
        condition: { expression: "attribute_exists(id)" }
      },
      {
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.userId }),
        update: {
          expression: "ADD followersCount :one",
          expressionValues: util.dynamodb.toMapValues({ ":one": 1 })
        },
        condition: { expression: "attribute_exists(id)" }
      }
    ]
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.appendError(ctx.error.message, ctx.error.type);
  }

  return true;
}
