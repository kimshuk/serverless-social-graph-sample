import { runtime, util } from "@aws-appsync/utils";

export function request(ctx) {
  const post = ctx.stash.post;

  if (!post || ctx.identity.username !== post.creator) {
    runtime.earlyReturn(false);
  }

  return {
    version: "2018-05-29",
    operation: "TransactWriteItems",
    transactItems: [
      {
        table: "#PostsTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.postId }),
        update: {
          expression: "SET #status = :deleted",
          expressionNames: { "#status": "status" },
          expressionValues: util.dynamodb.toMapValues({ ":deleted": "DELETED" })
        },
        condition: { expression: "attribute_exists(id)" }
      },
      {
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
        update: {
          expression: "ADD postsCount :minusOne, postLikeRecv :likeDelta",
          expressionValues: util.dynamodb.toMapValues({
            ":minusOne": -1,
            ":likeDelta": -post.likes
          })
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
