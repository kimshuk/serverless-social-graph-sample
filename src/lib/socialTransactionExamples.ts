export interface PostSnapshot {
  id: string;
  creator: string;
  likes: number;
}

export interface CommentSnapshot {
  id: string;
  creator: string;
  likes: number;
  dislikes: number;
}

export type CommentReaction = "NONE" | "LIKED" | "DISLIKED";

export interface TransactionWriteExample {
  table: string;
  operation: "PutItem" | "UpdateItem" | "DeleteItem";
  add?: Record<string, number>;
}

export function buildLikeTransaction(input: {
  actorId: string;
  post: PostSnapshot;
}): TransactionWriteExample[] {
  const transactItems: TransactionWriteExample[] = [
    { table: "LikesTable", operation: "PutItem" },
    { table: "PostsTable", operation: "UpdateItem", add: { likes: 1 } }
  ];

  if (input.actorId !== input.post.creator) {
    transactItems.push(
      { table: "UsersTable", operation: "UpdateItem", add: { postLikeSent: 1 } },
      { table: "UsersTable", operation: "UpdateItem", add: { postLikeRecv: 1 } }
    );
  }

  return transactItems;
}

export function buildFollowTransaction(input: {
  followerId: string;
  followeeId: string;
}): TransactionWriteExample[] {
  if (input.followerId === input.followeeId) {
    return [];
  }

  return [
    { table: "RelationshipsTable", operation: "PutItem" },
    { table: "UsersTable", operation: "UpdateItem", add: { followingCount: 1 } },
    { table: "UsersTable", operation: "UpdateItem", add: { followersCount: 1 } }
  ];
}

export function getCommentReactionDeltas(input: {
  currentReaction: CommentReaction;
  nextReaction: CommentReaction;
}) {
  const { currentReaction, nextReaction } = input;

  if (currentReaction === nextReaction) {
    return { likesDelta: 0, dislikesDelta: 0, shouldWrite: false };
  }

  if (nextReaction === "NONE") {
    return {
      likesDelta: currentReaction === "LIKED" ? -1 : 0,
      dislikesDelta: currentReaction === "DISLIKED" ? -1 : 0,
      shouldWrite: true
    };
  }

  return {
    likesDelta:
      nextReaction === "LIKED" ? 1 : currentReaction === "LIKED" ? -1 : 0,
    dislikesDelta:
      nextReaction === "DISLIKED" ? 1 : currentReaction === "DISLIKED" ? -1 : 0,
    shouldWrite: true
  };
}
