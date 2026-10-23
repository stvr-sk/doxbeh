export function setupDatePickers(inputs) {
  const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("sk", { month: "long" }).format(new Date(2026, month, 1)));
  const pad = (number) => String(number).padStart(2, "0");
  let closeActive = () => {};

  inputs.forEach((input) => {
    const isMonth = input.type === "month";
    const wrapper = document.createElement("div");
    wrapper.className = "date-picker";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "date-picker-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    const panel = document.createElement("div");
    panel.className = "date-picker-panel";
    panel.id = `${input.id}-picker`;
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", isMonth ? "Vybrať mesiac" : "Vybrať dátum");
    trigger.setAttribute("aria-controls", panel.id);
    input.before(wrapper);
    wrapper.append(input, trigger, panel);
    input.classList.add("date-picker-native");
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    const label = input.closest("label");
    const fieldLabel = label?.firstChild?.textContent.trim() || (isMonth ? "Mesiac" : "Dátum");
    if (label) {
      const field = document.createElement("div");
      field.className = "date-field";
      label.before(field);
      trigger.id = `${input.id}-trigger`;
      label.htmlFor = trigger.id;
      field.append(label, wrapper);
    }
    let cursor = new Date();

    function sync() {
      const value = input.value;
      let text = isMonth ? "Vybrať mesiac" : "Vybrať dátum";
      if (value) {
        const [year, month, day = 1] = value.split("-").map(Number);
        text = isMonth ? `${months[month - 1]} ${year}` : `${day}. ${month}. ${year}`;
      }
      trigger.textContent = text;
      trigger.setAttribute("aria-label", `${fieldLabel}: ${text}`);
    }
    function close() {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
    function button(text, action, className = "", selected = false) {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = text;
      element.className = className;
      if (selected) element.setAttribute("aria-current", "date");
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      });
      return element;
    }
    function select(value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      close();
      trigger.focus();
    }
    function render() {
      const year = cursor.getFullYear(), month = cursor.getMonth();
      const move = (direction) => {
        cursor = new Date(cursor.getFullYear() + (isMonth ? direction : 0), cursor.getMonth() + (isMonth ? 0 : direction), 1);
        render();
      };
      let header = panel.querySelector(".date-picker-header");
      if (!header) {
        header = document.createElement("div");
        header.className = "date-picker-header";
        const prev = button("‹", () => move(-1), "picker-prev");
        const next = button("›", () => move(1), "picker-next");
        prev.setAttribute("aria-label", isMonth ? "Predchádzajúci rok" : "Predchádzajúci mesiac");
        next.setAttribute("aria-label", isMonth ? "Nasledujúci rok" : "Nasledujúci mesiac");
        const heading = document.createElement("strong");
        header.append(prev, heading, next);
        panel.append(header);
      }
      header.querySelector("strong").textContent = isMonth ? year : `${months[month]} ${year}`;
      panel.querySelector(".picker-months, .picker-days")?.remove();
      const grid = document.createElement("div");
      grid.className = isMonth ? "picker-months" : "picker-days";
      if (isMonth) {
        months.forEach((name, index) => {
          const value = `${year}-${pad(index + 1)}`;
          grid.append(button(name, () => select(value), "picker-cell", input.value === value));
        });
      } else {
        ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].forEach((day) => {
          const span = document.createElement("span");
          span.className = "picker-weekday";
          span.textContent = day;
          grid.append(span);
        });
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        for (let i = 0; i < offset; i++) grid.append(document.createElement("span"));
        const today = new Date();
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
          const value = `${year}-${pad(month + 1)}-${pad(day)}`;
          const cell = button(day, () => select(value), "picker-cell", input.value === value);
          cell.setAttribute("aria-label", `${day}. ${months[month]} ${year}`);
          if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) cell.classList.add("picker-today");
          grid.append(cell);
        }
      }
      panel.append(grid);
    }
    trigger.addEventListener("click", () => {
      if (!panel.hidden) { close(); return; }
      closeActive();
      closeActive = close;
      const [year, month] = (input.value || `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}`).split("-").map(Number);
      cursor = new Date(year, month - 1, 1);
      render();
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    });
    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { close(); trigger.focus(); event.stopPropagation(); }
      if (event.key === "ArrowDown" && event.target === trigger) {
        event.preventDefault();
        if (panel.hidden) trigger.click();
        panel.querySelector('[aria-current="date"], .picker-cell')?.focus();
      }
    });
    document.addEventListener("focusin", (event) => {
      if (!wrapper.contains(event.target)) close();
    });
    document.addEventListener("click", (event) => {
      // The clicked arrow may already have been replaced during rendering.
      if (!event.composedPath().includes(wrapper)) close();
    });
    input.addEventListener("change", sync);
    input.addEventListener("invalid", (event) => {
      event.preventDefault();
      trigger.focus();
      if (panel.hidden) trigger.click();
    });
    input.form?.addEventListener("reset", () => setTimeout(sync, 0));
    sync();
  });
}
