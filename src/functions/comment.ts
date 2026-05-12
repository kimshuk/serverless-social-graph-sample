import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

export async function handler(event: {
  arguments: { postId: string; text: string };
  identity: { username: string };
}) {
  const commentId = ulid();
  const now = new Date().toISOString();
  const comment = {
    id: commentId,
    inCommentToPost: event.arguments.postId,
    creator: event.identity.username,
    text: event.arguments.text,
    likes: 0,
    dislikes: 0,
    createdAt: now
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.COMMENTS_TABLE!,
            Item: comment,
            ConditionExpression: "attribute_not_exists(id)"
          }
        },
        {
          Update: {
            TableName: process.env.POSTS_TABLE!,
            Key: { id: event.arguments.postId },
            UpdateExpression: "ADD comments :one",
            ExpressionAttributeValues: { ":one": 1 },
            ConditionExpression: "attribute_exists(id)"
          }
        },
        {
          Update: {
            TableName: process.env.USERS_TABLE!,
            Key: { id: event.identity.username },
            UpdateExpression: "ADD commentsCount :one",
            ExpressionAttributeValues: { ":one": 1 },
            ConditionExpression: "attribute_exists(id)"
          }
        }
      ]
    })
  );

  return comment;
}
