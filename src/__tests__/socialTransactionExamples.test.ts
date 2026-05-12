import {
  buildFollowTransaction,
  buildLikeTransaction,
  getCommentReactionDeltas
} from "../lib/socialTransactionExamples";
import { describe, expect, it } from "@jest/globals";

describe("social transaction examples", () => {
  it("adds post and user counter writes for likes by another user", () => {
    const items = buildLikeTransaction({
      actorId: "user-1",
      post: { id: "post-1", creator: "user-2", likes: 0 }
    });

    expect(items).toHaveLength(4);
    expect(items.map((item) => item.table)).toEqual([
      "LikesTable",
      "PostsTable",
      "UsersTable",
      "UsersTable"
    ]);
  });

  it("does not increment sent/received like counters for self-like", () => {
    const items = buildLikeTransaction({
      actorId: "user-1",
      post: { id: "post-1", creator: "user-1", likes: 0 }
    });

    expect(items).toHaveLength(2);
  });

  it("builds follow relationship and both aggregate counter updates", () => {
    const items = buildFollowTransaction({
      followerId: "user-1",
      followeeId: "user-2"
    });

    expect(items).toHaveLength(3);
    expect(items[1]).toMatchObject({ add: { followingCount: 1 } });
    expect(items[2]).toMatchObject({ add: { followersCount: 1 } });
  });

  it("computes comment reaction transition deltas", () => {
    expect(
      getCommentReactionDeltas({
        currentReaction: "LIKED",
        nextReaction: "DISLIKED"
      })
    ).toEqual({
      likesDelta: -1,
      dislikesDelta: 1,
      shouldWrite: true
    });
  });
});
