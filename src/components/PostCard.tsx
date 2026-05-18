"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Heart, Trash2 } from "lucide-react";
import { postApi } from "@/lib/api";

export interface PostResponse {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    profilePictureUrl?: string;
  };
  likeCount: number;
  replyCount: number;
  parentPostId?: string;
  deleted: boolean;
}

export function PostCard({ post, currentUser, onDelete }: { post: PostResponse, currentUser?: any, onDelete?: (id: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (post.deleted) {
    return (
      <div className="p-4 border border-border rounded-lg bg-muted text-muted-foreground italic">
        This post has been deleted.
      </div>
    );
  }

  const handleLike = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (liked) {
        await postApi.unlike(post.id);
        setLikeCount(prev => prev - 1);
        setLiked(false);
      } else {
        await postApi.like(post.id);
        setLikeCount(prev => prev + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      await postApi.delete(post.id);
      if (post.imageUrl) {
        try {
          await fetch("/api/cloudinary/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl: post.imageUrl }),
          });
        } catch (cloudinaryError) {
          console.error("Failed to delete Cloudinary image", cloudinaryError);
        }
      }
      if (onDelete) onDelete(post.id);
    } catch (err) {
      console.error("Failed to delete post", err);
      setDeleting(false); // only re-enable if failed, otherwise component might unmount
    }
  };

  return (
    <article className="p-4 border border-border rounded-lg bg-background hover:border-primary transition-colors flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold overflow-hidden shrink-0">
          {post.author.profilePictureUrl ? (
            <img src={post.author.profilePictureUrl} alt={post.author.username} className="w-full h-full object-cover" />
          ) : (
            post.author.username.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <Link href={`/users/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.username}
          </Link>
          <div className="text-xs text-muted-foreground">
            {new Date(post.createdAt).toLocaleDateString()}
          </div>
        </div>
        {currentUser?.username === post.author.username && (
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-red-500 transition-colors p-2"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-sm">{post.content}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post attachment"
          className="rounded-md w-full max-h-96 object-cover"
        />
      )}

      <div className="flex items-center gap-6 text-muted-foreground mt-2">
        <button 
          onClick={handleLike}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? "text-red-500" : "hover:text-red-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <Link href={`/posts/${post.id}`} className="flex items-center gap-1.5 text-xs hover:text-blue-500 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>{post.replyCount}</span>
        </Link>
      </div>
    </article>
  );
}
