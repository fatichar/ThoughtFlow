import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { type Tag } from "../types/flow";
import { createTag } from "../api/tags";
import { tagColorStyle } from "../utils/tagColors";

type TagComboBoxProps = {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onTagCreated: (tag: Tag) => void;
};

export function TagComboBox({
  availableTags,
  selectedTags,
  onTagsChange,
  onTagCreated,
}: TagComboBoxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTagIds = new Set(selectedTags.map((t) => t.id));
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTagIds.has(tag.id) &&
      tag.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = filteredTags.find(
    (tag) => tag.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const showCreateOption =
    query.trim().length > 0 &&
    !availableTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreateTag() {
    const name = query.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const newTag = await createTag(name);
      onTagCreated(newTag);
      onTagsChange([...selectedTags, newTag]);
      setQuery("");
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      setCreateError(e instanceof Error ? e.message : "Could not create tag");
    } finally {
      setIsCreating(false);
    }
  }

  function addTag(tag: Tag) {
    if (selectedTagIds.has(tag.id)) {
      return;
    }

    onTagsChange([...selectedTags, tag]);
    setQuery("");
    setIsOpen(false);
  }

  function removeTag(tag: Tag) {
    onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (exactMatch) {
      addTag(exactMatch);
      return;
    }

    if (showCreateOption) {
      void handleCreateTag();
      return;
    }

    if (filteredTags.length === 1) {
      addTag(filteredTags[0]);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="flex cursor-default select-none items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-bold text-white shadow-sm"
            style={tagColorStyle(tag.color)}
          >
            {tag.name}
            <button
              type="button"
              title={`Remove ${tag.name}`}
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className="ml-1 grid h-4 w-4 place-items-center rounded-full hover:bg-black/20"
              aria-label={`Remove ${tag.name}`}
            >
              <X size={12} strokeWidth={3} />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        className="editor-input w-full"
        placeholder="Search or create tags..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCreateError(null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
      />

      {isOpen && (filteredTags.length > 0 || showCreateOption) ? (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto border border-ink/10 bg-canvas p-1 shadow-node">
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-leaf/10 hover:text-moss"
              onClick={() => addTag(tag)}
            >
              {tag.name}
            </button>
          ))}
          {showCreateOption ? (
            <button
              type="button"
              disabled={isCreating}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-moss hover:bg-leaf/10 disabled:opacity-50"
              onClick={() => void handleCreateTag()}
            >
              <Plus size={16} />
              {isCreating ? "Creating..." : `Create "${query.trim()}"`}
            </button>
          ) : null}
        </div>
      ) : null}
      {createError ? (
        <p className="mt-2 text-xs font-bold normal-case tracking-normal text-clay">
          {createError}
        </p>
      ) : null}
    </div>
  );
}
