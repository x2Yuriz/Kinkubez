import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { REGION_LABEL, searchProvinces, toProvince } from "../lib/provinces";

type Props = { value: string; onChange: (province: string) => void };

/** Searchable province picker (ARIA 1.2 combobox + listbox). Accepts Thai, English and aliases like "กทม". */
export default function ProvinceCombobox({ value, onChange }: Props) {
  const listId = useId();
  const statusId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(false);

  useEffect(() => { if (!open) setText(value); }, [value, open]);

  // Opening shows every province; typing filters.
  const results = useMemo(() => searchProvinces(typed ? text : ""), [text, typed]);
  const optionId = (index: number) => `${listId}-opt-${index}`;

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  const openList = () => {
    setOpen(true);
    setTyped(false);
    setActive(Math.max(0, searchProvinces("").findIndex((p) => p.th === value)));
  };

  const close = (revert = true) => {
    setOpen(false);
    setTyped(false);
    if (revert) setText(value);
  };

  const choose = (province: string) => {
    onChange(province);
    setText(province);
    setOpen(false);
    setTyped(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList(); else setActive((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList(); else setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home": case "End":
        if (open && results.length) { event.preventDefault(); setActive(event.key === "Home" ? 0 : results.length - 1); }
        break;
      case "Enter": {
        if (!open) return;
        event.preventDefault();
        const pick = results[active] ?? (toProvince(text) ? { th: toProvince(text)! } : null);
        if (pick) choose(pick.th);
        break;
      }
      case "Escape":
        if (open) { event.preventDefault(); close(); }
        else if (text !== value) setText(value);
        break;
      case "Tab":
        if (open) close();
        break;
    }
  };

  return (
    <div className="province-combobox">
      <input
        id="province-search"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? optionId(active) : undefined}
        aria-describedby={statusId}
        autoComplete="off"
        spellCheck={false}
        placeholder="พิมพ์ชื่อจังหวัด เช่น เชียงใหม่ หรือ Phuket"
        value={text}
        onFocus={(event) => event.currentTarget.select()}
        onClick={() => { if (!open) openList(); }}
        onChange={(event) => { setText(event.target.value); setTyped(true); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
        onBlur={() => close()}
      />
      <span className="province-combobox__chevron" aria-hidden="true">⌄</span>
      <ul ref={listRef} id={listId} role="listbox" aria-label="จังหวัด" className="province-combobox__list" hidden={!open}>
        {results.map((province, index) => (
          <li
            key={province.th}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={`province-combobox__option${index === active ? " is-active" : ""}${province.th === value ? " is-current" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => { if (index !== active) setActive(index); }}
            onClick={() => choose(province.th)}
          >
            <span>{province.th}</span>
            <small>{province.en} · {REGION_LABEL[province.region]}</small>
          </li>
        ))}
        {!results.length ? <li className="province-combobox__empty" role="presentation">ไม่พบจังหวัด “{text.trim()}” ลองพิมพ์ชื่อไทยหรืออังกฤษ</li> : null}
      </ul>
      <span id={statusId} className="kk-visually-hidden" aria-live="polite">
        {open ? (results.length ? `พบ ${results.length} จังหวัด ใช้ลูกศรขึ้นลงเพื่อเลือก` : "ไม่พบจังหวัด") : ""}
      </span>
    </div>
  );
}
