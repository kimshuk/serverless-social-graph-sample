import { util } from "@aws-appsync/utils";

export function request(ctx) {
  return {
    operation: "Query",
    index: "byOtherUser",
    query: {
      expression: "otherUserId = :userId AND begins_with(sk, :prefix)",
      expressionValues: util.dynamodb.toMapValues({
        ":userId": ctx.args.userId,
        ":prefix": "FOLLOWS_"
      })
    },
    limit: ctx.args.limit,
    nextToken: ctx.args.nextToken
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.appendError(ctx.error.message, ctx.error.type);
  }

  return {
    profiles: (ctx.result.items ?? []).map((item) => ({ id: item.userId })),
    nextToken: ctx.result.nextToken
  };
}
