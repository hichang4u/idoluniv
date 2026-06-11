export type PostType = "text" | "image" | "video" | "fanfic";
export type ReactionType = "like" | "scrap";
export type ReactionTarget = "post" | "comment";

export interface IdolGroup {
  id: string;
  name: string;
  name_ko: string | null;
  slug: string;
  agency: string | null;
  debut_date: string | null;
  cover_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string | null;
  idol_group_id: string | null;
  title: string;
  content: string;
  post_type: PostType;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // join
  author?: Pick<User, "id" | "nickname" | "avatar_url"> | null;
  idol_group?: Pick<IdolGroup, "id" | "name" | "slug"> | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // join
  author?: Pick<User, "id" | "nickname" | "avatar_url"> | null;
  replies?: Comment[];
}

export interface Reaction {
  id: string;
  session_id: string;
  user_id: string | null;
  target_type: ReactionTarget;
  target_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface PostWithRelations extends Post {
  author: Pick<User, "id" | "nickname" | "avatar_url"> | null;
  idol_group: Pick<IdolGroup, "id" | "name" | "slug"> | null;
}

export interface ChatRoom {
  id: string;
  group_id: string;
  created_at: string;
  idol_group?: Pick<IdolGroup, "id" | "name" | "name_ko" | "slug" | "cover_url"> | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  author_id: string | null;
  session_id: string | null;
  nickname: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
}
