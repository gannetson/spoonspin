import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  deleteMyTag,
  fetchMyTags,
  upsertMyTag,
  uploadTagPhotos,
  removeTagPhoto,
} from "@/tags/client";
import type { TagEntityType, TagIntent, UserTag } from "@/tags/types";

type TagsContextValue = {
  tags: UserTag[];
  loading: boolean;
  tagFor: (
    entityType: TagEntityType,
    entityId: string,
    countryCode: string,
  ) => UserTag | undefined;
  saveTag: (input: {
    entityType: TagEntityType;
    entityId: string;
    entityName: string;
    countryCode: string;
    intent: TagIntent;
    rating?: number | null;
    reviewText?: string | null;
  }) => Promise<UserTag>;
  removeTag: (id: string) => Promise<void>;
  addPhotos: (tagId: string, files: File[]) => Promise<UserTag>;
  removePhoto: (tagId: string, url: string) => Promise<UserTag>;
  refresh: () => Promise<void>;
};

const TagsContext = createContext<TagsContextValue | null>(null);

function tagKey(
  entityType: TagEntityType,
  entityId: string,
  countryCode: string,
): string {
  return `${entityType}:${countryCode.toLowerCase()}:${entityId}`;
}

export function TagsProvider({
  countryCode,
  children,
}: {
  /** When set, prefetch tags for this country. */
  countryCode?: string | null;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setTags([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchMyTags(countryCode ? { countryCode } : undefined);
      setTags(list);
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [user, countryCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byKey = useMemo(() => {
    const map = new Map<string, UserTag>();
    for (const tag of tags) {
      map.set(tagKey(tag.entityType, tag.entityId, tag.countryCode), tag);
    }
    return map;
  }, [tags]);

  const replaceTag = useCallback((next: UserTag) => {
    setTags((prev) => {
      const without = prev.filter((t) => t.id !== next.id);
      const sameItem = without.filter(
        (t) =>
          !(
            t.entityType === next.entityType &&
            t.entityId === next.entityId &&
            t.countryCode === next.countryCode
          ),
      );
      return [next, ...sameItem];
    });
  }, []);

  const value = useMemo<TagsContextValue>(
    () => ({
      tags,
      loading,
      tagFor: (entityType, entityId, code) =>
        byKey.get(tagKey(entityType, entityId, code)),
      saveTag: async (input) => {
        const tag = await upsertMyTag(input);
        replaceTag(tag);
        return tag;
      },
      removeTag: async (id) => {
        await deleteMyTag(id);
        setTags((prev) => prev.filter((t) => t.id !== id));
      },
      addPhotos: async (tagId, files) => {
        const tag = await uploadTagPhotos(tagId, files);
        replaceTag(tag);
        return tag;
      },
      removePhoto: async (tagId, url) => {
        const tag = await removeTagPhoto(tagId, url);
        replaceTag(tag);
        return tag;
      },
      refresh,
    }),
    [tags, loading, byKey, replaceTag, refresh],
  );

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags(): TagsContextValue {
  const ctx = useContext(TagsContext);
  if (!ctx) {
    throw new Error("useTags must be used within TagsProvider");
  }
  return ctx;
}

/** Optional — returns null outside provider (cards may render without it). */
export function useTagsOptional(): TagsContextValue | null {
  return useContext(TagsContext);
}
