import { runtime, util } from "@aws-appsync/utils";

export function request(ctx) {
  const Reaction = {
    NONE: "NONE",
    LIKED: "LIKED",
    DISLIKED: "DISLIKED"
  };
  const nextReaction = ctx.args.reaction;
  const currentReaction = ctx.prev.result ? ctx.prev.result.reaction : Reaction.NONE;
  const comment = ctx.stash.comment;

  if (nextReaction === currentReaction) {
    runtime.earlyReturn(true);
  }

  const updateUserStats = ctx.identity.username !== comment.creator;
  const transactItems = [];

  if (nextReaction === Reaction.NONE) {
    const reactionField = currentReaction === Reaction.LIKED ? "likes" : "dislikes";
    transactItems.push({
      table: "#CommentReactionsTable#",
      operation: "DeleteItem",
      key: util.dynamodb.toMapValues({
        userId: ctx.identity.username,
        commentId: ctx.args.commentId
      }),
      condition: { expression: "attribute_exists(commentId)" }
    });
    transactItems.push({
      table: "#CommentsTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({ id: ctx.args.commentId }),
      update: {
        expression: `ADD ${reactionField} :minusOne`,
        expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
      },
      condition: { expression: "attribute_exists(id)" }
    });

    if (updateUserStats) {
      const sentField =
        currentReaction === Reaction.LIKED ? "commentLikeSent" : "commentDislikeSent";
      const recvField =
        currentReaction === Reaction.LIKED ? "commentLikeRecv" : "commentDislikeRecv";
      transactItems.push({
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
        update: {
          expression: `ADD ${sentField} :minusOne`,
          expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
        },
        condition: { expression: "attribute_exists(id)" }
      });
      transactItems.push({
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: comment.creator }),
        update: {
          expression: `ADD ${recvField} :minusOne`,
          expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
        },
        condition: { expression: "attribute_exists(id)" }
      });
    }
  } else {
    const likesDelta =
      nextReaction === Reaction.LIKED
        ? 1
        : currentReaction === Reaction.LIKED
          ? -1
          : 0;
    const dislikesDelta =
      nextReaction === Reaction.DISLIKED
        ? 1
        : currentReaction === Reaction.DISLIKED
          ? -1
          : 0;

    transactItems.push({
      table: "#CommentReactionsTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({
        userId: ctx.identity.username,
        commentId: ctx.args.commentId
      }),
      update: {
        expression: "SET reaction = :reaction",
        expressionValues: util.dynamodb.toMapValues({ ":reaction": nextReaction })
      }
    });
    transactItems.push({
      table: "#CommentsTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({ id: ctx.args.commentId }),
      update: {
        expression: "ADD likes :likesDelta, dislikes :dislikesDelta",
        expressionValues: util.dynamodb.toMapValues({
          ":likesDelta": likesDelta,
          ":dislikesDelta": dislikesDelta
        })
      },
      condition: { expression: "attribute_exists(id)" }
    });

    if (updateUserStats) {
      transactItems.push({
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
        update: {
          expression:
            "ADD commentLikeSent :likesDelta, commentDislikeSent :dislikesDelta",
          expressionValues: util.dynamodb.toMapValues({
            ":likesDelta": likesDelta,
            ":dislikesDelta": dislikesDelta
          })
        },
        condition: { expression: "attribute_exists(id)" }
      });
      transactItems.push({
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: comment.creator }),
        update: {
          expression:
            "ADD commentLikeRecv :likesDelta, commentDislikeRecv :dislikesDelta",
          expressionValues: util.dynamodb.toMapValues({
            ":likesDelta": likesDelta,
            ":dislikesDelta": dislikesDelta
          })
        },
        condition: { expression: "attribute_exists(id)" }
      });
    }
  }

  return {
    version: "2018-05-29",
    operation: "TransactWriteItems",
    transactItems
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.appendError(ctx.error.message, ctx.error.type);
  }

  return true;
}
