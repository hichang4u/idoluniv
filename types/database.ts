// 도메인 타입. 테이블 행은 생성된 DB 타입(types/supabase.ts)에서 파생한다.
// 스키마가 바뀌면 `npx supabase gen types typescript --linked --schema public > types/supabase.ts`
// 로 다시 생성한다(TECH-DESIGN AD-14).
import type { Database } from "./supabase";

type Tables = Database["public"]["Tables"];
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];

// posts.post_type 은 CHECK 제약이 있는 text 컬럼이라 생성 타입은 string 이다.
// 폼 입력값처럼 값을 좁혀야 하는 곳에서만 이 유니온을 쓴다.
export type PostType = "text" | "image" | "video" | "fanfic";
export type ReactionType = "like" | "scrap";
export type ReactionTarget = "post" | "comment";

export type IdolGroup = TableRow<"idol_groups">;
export type Post = TableRow<"posts">;
export type Comment = TableRow<"comments">;
export type ChatMessage = TableRow<"chat_messages">;
export type Reaction = TableRow<"reactions">;

// users 는 공개 컬럼만 GRANT 되어 있다(0004). email 은 select 하면 권한 오류가 난다.
export type PublicUser = Pick<TableRow<"users">, "id" | "nickname" | "avatar_url">;

// ── 조회 결과 모양 ────────────────────────────────────────
// 쿼리의 select 문자열과 맞지 않으면 대입하는 곳에서 컴파일 오류가 난다(캐스트 금지).

export type PostListItem = Pick<
  Post,
  "id" | "title" | "content" | "post_type" | "like_count" | "comment_count" | "view_count" | "created_at" | "updated_at"
> & {
  author: PublicUser | null;
  idol_group: Pick<IdolGroup, "id" | "name" | "slug"> | null;
};

export type CommentWithAuthor = Pick<
  Comment,
  "id" | "post_id" | "parent_id" | "content" | "like_count" | "is_hidden" | "created_at" | "updated_at"
> & {
  author: PublicUser | null;
  replies?: CommentWithAuthor[];
};
