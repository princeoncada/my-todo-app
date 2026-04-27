import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface ListInlineEditProps {
  id: string;
  value: string;
  onSave: (input: { id: string; name: string; }) => void;
  disabled?: boolean,
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
}

export default function ListInlineEdit({
  id,
  value,
  onSave,
  disabled = false,
  className = "",
  inputClassName = "",
  displayClassName = "",
}: ListInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setEditValue(value);
    setDisplayValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();

    if (!trimmed) {
      setEditValue(value);
      setDisplayValue(value);
      setIsEditing(false);
      return;
    }

    if (trimmed !== value) {
      // Local instant UI
      setDisplayValue(trimmed);

      // Cache/server mutation
      onSave({
        id,
        name: trimmed,
      });
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setDisplayValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing && !disabled) {
    return (
      <Textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={editValue}
        disabled={disabled}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        rows={1}
        className={`
        ${className}
        ${inputClassName}
        min-h-5 resize-none overflow-hidden
        whitespace-normal break-all
        focus-visible:ring-0 border-0 px-0! py-0! rounded-none
      `}
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className={`${className} ${displayClassName} cursor-pointer rounded-sm transition-colors block w-full min-w-0`}
    >
      {displayValue}
    </span>
  );
}