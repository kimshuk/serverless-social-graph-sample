import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

export async function handler(event: {
  arguments: { text: string };
  identity: { username: string };
}) {
  const postId = ulid();
  const now = new Date().toISOString();
  const post = {
    id: postId,
    creator: event.identity.username,
    text: event.arguments.text,
    status: "PUBLIC",
    likes: 0,
    comments: 0,
    createdAt: now
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.POSTS_TABLE!,
            Item: post,
            ConditionExpression: "attribute_not_exists(id)"
          }
        },
        {
          Update: {
            TableName: process.env.USERS_TABLE!,
            Key: { id: event.identity.username },
            UpdateExpression: "ADD postsCount :one",
            ExpressionAttributeValues: { ":one": 1 },
            ConditionExpression: "attribute_exists(id)"
          }
        }
      ]
    })
  );

  return post;
}
