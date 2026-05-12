import { runtime, util } from "@aws-appsync/utils";

export function request(ctx) {
  const comment = ctx.stash.comment;

  if (!comment || ctx.identity.username !== comment.creator) {
    runtime.earlyReturn(false);
  }

  return {
    version: "2018-05-29",
    operation: "TransactWriteItems",
    transactItems: [
      {
        table: "#CommentsTable#",
        operation: "DeleteItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.commentId }),
        condition: { expression: "attribute_exists(id)" }
      },
      {
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
        update: {
          expression:
            "ADD commentsCount :minusOne, commentLikeRecv :likeDelta, commentDislikeRecv :dislikeDelta",
          expressionValues: util.dynamodb.toMapValues({
            ":minusOne": -1,
            ":likeDelta": -comment.likes,
            ":dislikeDelta": -comment.dislikes
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
