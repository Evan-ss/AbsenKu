"use client";

import { useState, useEffect, useRef } from "react";

interface DateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

// Convert YYYY-MM-DD to dd/mm/yyyy for display
function toDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Convert dd/mm/yyyy to YYYY-MM-DD for value
function toValue(display: string): string {
  const parts = display.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return "";
  if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return "";
  return `${yyyy}-${mm}-${dd}`;
}

export default function DateInput({ value, onChange, className = "", placeholder = "dd/mm/yyyy" }: DateInputProps) {
  const [display, setDisplay] = useState(toDisplay(value));
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDisplay(toDisplay(value));
    }
  }, [value, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Auto-insert slashes
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 2) {
      val = digits;
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }

    setDisplay(val);

    // If full date entered, convert and call onChange
    const fullValue = toValue(val);
    if (fullValue) {
      onChange(fullValue);
    }
  };

  const handleBlur = () => {
    setEditing(false);
    // Validate and reset if invalid
    const fullValue = toValue(display);
    if (!fullValue) {
      setDisplay(toDisplay(value));
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={display}
        onChange={handleChange}
        onFocus={() => setEditing(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={10}
        className={className}
      />
    </div>
  );
}
