import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { postId } = ctx.args;
  const post = ctx.prev.result;
  const transactions = [
    {
      table: "#LikesTable#",
      operation: "DeleteItem",
      key: util.dynamodb.toMapValues({
        userId: ctx.identity.username,
        postId
      }),
      condition: { expression: "attribute_exists(postId)" }
    },
    {
      table: "#PostsTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({ id: postId }),
      update: {
        expression: "ADD likes :minusOne",
        expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
      },
      condition: { expression: "attribute_exists(id)" }
    }
  ];

  if (ctx.identity.username !== post.creator) {
    transactions.push({
      table: "#UsersTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({ id: ctx.identity.username }),
      update: {
        expression: "ADD postLikeSent :minusOne",
        expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
      },
      condition: { expression: "attribute_exists(id)" }
    });

    transactions.push({
      table: "#UsersTable#",
      operation: "UpdateItem",
      key: util.dynamodb.toMapValues({ id: post.creator }),
      update: {
        expression: "ADD postLikeRecv :minusOne",
        expressionValues: util.dynamodb.toMapValues({ ":minusOne": -1 })
      },
      condition: { expression: "attribute_exists(id)" }
    });
  }

  return {
    version: "2018-05-29",
    operation: "TransactWriteItems",
    transactItems: transactions
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.appendError(ctx.error.message, ctx.error.type);
  }

  return true;
}
