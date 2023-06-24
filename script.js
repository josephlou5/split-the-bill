const SUMMARY_UNPAID_COLUMN_CLASS = "summary-unpaid-column";

Array.fromRange = (length, func = null) =>
  new Array(length)
    .fill(null)
    .map((value, index) => (func ? func(index) : index));

Object.fromArray = (array, func) =>
  Object.fromEntries(array.map((value, index) => [value, func(value, index)]));

$.fn.getId = function () {
  return this.get(0)?.id;
};

$.fn.forEach = function (func) {
  this.each((index, element) => func($(element), index));
};

$.fn.mapEach = function (func) {
  const result = [];
  this.forEach(($element, index) => {
    const value = func($element, index);
    if (value == null) return;
    result.push(value);
  });
  return result;
};

function int(num) {
  return Math.trunc(num);
}

function divmod(dividend, divisor) {
  dividend = Math.round(dividend);
  const quotient = int(dividend / divisor);
  const rem = int(dividend - divisor * quotient);
  return [quotient, rem];
}

function parseMakeHtmlArgs_(args) {
  function defaultAttrs() {
    return {};
  }
  function defaultContent() {
    return "";
  }

  function convertContent(arg) {
    if (typeof arg === "string") {
      return arg;
    }
    if (Array.isArray(arg)) {
      return arg.join("");
    }
    return null;
  }

  if (args.length === 0) {
    // use defaults
    return { attrs: defaultAttrs(), content: defaultContent() };
  }
  if (args.length === 1) {
    const arg = args[0];
    const content = convertContent(arg);
    if (content == null) {
      // attrs
      return { attrs: arg, content: defaultContent() };
    } else {
      return { attrs: defaultAttrs(), content: content };
    }
  }
  const [attrs, content] = args;
  return { attrs, content: convertContent(content) ?? content };
}

/**
 * Returns a string representing an HTML tag.
 *
 * Also checks for self-closing tags.
 *
 * makeHtml_(tag);
 * makeHtml_(tag, {...attrs});
 * makeHtml_(tag, 'content');
 * makeHtml_(tag, [...content]);
 * makeHtml_(tag, {...attrs}, 'content');
 * makeHtml_(tag, {...attrs}, [...content]);
 */
function makeHtml_() {
  const SELF_CLOSING_TAGS = ["input"];

  if (arguments.length === 0) {
    // no tag given
    return "";
  }
  const [tag, ...otherArgs] = arguments;
  const { attrs, content } = parseMakeHtmlArgs_(otherArgs);

  const attrList = Object.entries(attrs).flatMap(([key, value]) => {
    if (value === true) {
      return [key];
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return [];
      value = value.join(" ");
    }
    return [`${key}="${value}"`];
  });
  const openTagStr = [tag, ...attrList].join(" ");

  // self-closing tags
  if (SELF_CLOSING_TAGS.includes(tag)) {
    return `<${openTagStr} />`;
  }

  const contentStr = Array.isArray(content) ? content.join("") : content;
  return `<${openTagStr}>${contentStr}</${tag}>`;
}

/**
 * Returns a string representing an HTML tag for a button.
 * Accepts the same args as `makeHtml_()`, but without the tag.
 *
 * Ensures the `type="button"` attribute is set if not present in the args.
 *
 * If the attribute `onclickUpdate` is given, it will replace the `onclick`
 * attribute wrapped with `updateOnSuccess_`.
 */
function makeButton_() {
  const { attrs, content } = parseMakeHtmlArgs_(arguments);
  // ensure that the type is a button
  if (attrs.type == null) {
    attrs.type = "button";
  }
  if (attrs.onclickUpdate != null) {
    attrs.onclick = `updateOnSuccess_(() => { return ${attrs.onclickUpdate} });`;
    delete attrs.onclickUpdate;
  }
  return makeHtml_("button", attrs, content);
}

function makeBsIcon_(code, attrs = {}) {
  let { class: classes = [], ...passAttrs } = attrs;
  if (!Array.isArray(classes)) {
    classes = [classes];
  }
  classes.push("bi", `bi-${code}`);
  passAttrs.class = classes;
  return makeHtml_("i", passAttrs);
}

function makeBsBadge_(accent, text) {
  return makeHtml_("span", { class: ["badge", `bg-${accent}`] }, text);
}

function updateOnSuccess_(actionFunc, ...args) {
  if (actionFunc(...args)) {
    updateSummary();
  }
}

function makeDeleteButton(className, id, classes = []) {
  return makeButton_(
    {
      class: ["btn", "btn-sm", "btn-danger", ...classes],
      onclickUpdate: `${className}.remove('${id}');`,
    },
    makeBsIcon_("x-lg")
  );
}

class Checkbox {
  static CHECKBOX_CLASS = "checkbox";

  static CHECKED_ACCENT_ = "success";
  static UNCHECKED_ACCENT_ = "outline-danger";

  static makeEntireToggleButton(type, id) {
    return makeHtml_(
      "td",
      { class: [id, "text-center"] },
      makeButton_(
        {
          class: ["btn", "btn-sm", "btn-outline-secondary"],
          onclickUpdate: `Checkbox.toggleEntire('${type}', '${id}');`,
        },
        makeBsIcon_("toggles")
      )
    );
  }

  static iconId_(checked, itemId, personId, { asSelector = false } = {}) {
    const pound = asSelector ? "#" : "";
    const suffix = checked ? "checked" : "unchecked";
    return `${pound}${itemId}-${personId}-${suffix}`;
  }

  static makeCheckboxCell(itemId, personId) {
    // make the checkbox unchecked by default
    return makeHtml_(
      "td",
      { class: [personId, "text-center"] },
      makeButton_(
        {
          id: `${itemId}-${personId}-checkbox`,
          item: itemId,
          person: personId,
          class: [
            "btn",
            `btn-${Checkbox.UNCHECKED_ACCENT_}`,
            Checkbox.CHECKBOX_CLASS,
            "w-100",
            "h-100",
          ],
          onclickUpdate: "new Checkbox($(this)).toggle();",
        },
        [
          makeBsIcon_("x", { id: Checkbox.iconId_(false, itemId, personId) }),
          makeBsIcon_("check-lg", {
            id: Checkbox.iconId_(true, itemId, personId),
            class: ["d-none"],
          }),
        ]
      )
    );
  }

  constructor($button) {
    this.$button = $button;
    this.itemId = this.$button.attr("item");
    this.personId = this.$button.attr("person");
    this.$icons = {};
  }

  isChecked() {
    return this.$button.prop("checked");
  }

  getIcon_({ checked } = {}) {
    const key = `${checked ? "" : "un"}checked`;
    if (this.$icons[key] == null) {
      this.$icons[key] = $(
        Checkbox.iconId_(checked, this.itemId, this.personId, {
          asSelector: true,
        })
      );
    }
    return this.$icons[key];
  }

  /**
   * Sets the state of the checkbox.
   * Returns whether the state changed.
   */
  set(checked) {
    if (this.isChecked() === checked) return false;
    if (checked) {
      // make it checked
      this.$button
        .addClass(`btn-${Checkbox.CHECKED_ACCENT_}`)
        .removeClass(`btn-${Checkbox.UNCHECKED_ACCENT_}`);
      this.$button.prop("checked", true);
      this.getIcon_({ checked: true }).removeClass("d-none");
      this.getIcon_({ checked: false }).addClass("d-none");
    } else {
      // make it unchecked
      this.$button
        .addClass(`btn-${Checkbox.UNCHECKED_ACCENT_}`)
        .removeClass(`btn-${Checkbox.CHECKED_ACCENT_}`);
      this.$button.prop("checked", false);
      this.getIcon_({ checked: false }).removeClass("d-none");
      this.getIcon_({ checked: true }).addClass("d-none");
    }
    return true;
  }

  toggle() {
    return this.set(!this.isChecked());
  }

  static toggleEntire(type, id) {
    const checkboxes = $(
      `.${Checkbox.CHECKBOX_CLASS}[${type.toLowerCase()}="${id}"]`
    ).mapEach(($button) => new Checkbox($button));
    if (checkboxes.length === 0) return false;
    // check if all checkboxes are currently toggled
    const allChecked = checkboxes.every((checkbox) => checkbox.isChecked());
    checkboxes.forEach((checkbox) => {
      // if everything is checked, uncheck everything
      // otherwise, check everything
      checkbox.set(!allChecked);
    });
    return true;
  }

  /**
   * Returns a mapping from item ids to an array of person ids who were checked
   * for that item.
   */
  static findAllChecked() {
    const checked = Object.fromArray(Item.getIds(), () => []);
    $(`.${Checkbox.CHECKBOX_CLASS}`).forEach(($button) => {
      const checkbox = new Checkbox($button);
      if (!checkbox.isChecked()) return;
      checked[checkbox.itemId].push(checkbox.personId);
    });
    return checked;
  }
}

class Person {
  static personCounter_ = 0;

  static COL_CLASS = "person-col";
  static ITEM_PRICE_CLASS = "person-item-price";
  static TAX_TIP_PRICE_CLASS = "person-tax-tip-price";
  static TOTAL_PRICE_CLASS = "person-total-price";

  static select_() {
    return $(`.${Person.COL_CLASS}`);
  }

  static getIds() {
    return Person.select_().mapEach(($element) => $element.getId());
  }

  static numPeople() {
    return Person.select_().length;
  }

  static updateNumPeople() {
    $("#num-people").text(Person.numPeople());
  }

  static getNameOf(personId) {
    const $label = $(`#${personId}-label`);
    if ($label.length === 0) return null;
    return $label.text();
  }

  constructor(name) {
    this.name = name || null;
    this.personId = `person${Person.personCounter_++}`;
  }

  makeNameCell_() {
    return makeHtml_(
      "td",
      {
        id: this.personId,
        class: [Person.COL_CLASS, this.personId, "text-center"],
      },
      makeHtml_("div", { class: ["d-flex", "align-items-center"] }, [
        makeHtml_("div", { id: `${this.personId}-label`, class: ["w-100"] }),
        makeHtml_(
          "div",
          { class: ["w-auto", "ms-1"] },
          makeDeleteButton("Person", this.personId, ["ms-1"])
        ),
      ])
    );
  }

  makePriceCell_(classes = []) {
    return makeHtml_(
      "td",
      {
        class: [this.personId, ...classes, "text-center"],
        person: this.personId,
      },
      "$0.00"
    );
  }

  makeItemPriceCell_() {
    return this.makePriceCell_([Person.ITEM_PRICE_CLASS]);
  }

  makeTaxTipPriceCell_() {
    return this.makePriceCell_([Person.TAX_TIP_PRICE_CLASS]);
  }

  makeTotalPriceCell_() {
    return this.makePriceCell_([Person.TOTAL_PRICE_CLASS, "fw-bold"]);
  }

  add() {
    if (this.name == null) return false;

    // add the column
    $("#add-person-col").before(this.makeNameCell_());
    // set the text of the person's name (escaped)
    $(`#${this.personId}-label`).text(this.name);

    // person's item price
    $("#items-per-person-row").append(this.makeItemPriceCell_());
    // person's tax/tip price
    $("#tax-tip-per-person-row").append(this.makeTaxTipPriceCell_());
    // person's total price
    $("#total-per-person-row").append(this.makeTotalPriceCell_());

    // toggle entire person
    $("#toggle-person-row").append(
      Checkbox.makeEntireToggleButton("person", this.personId)
    );

    // add the checkboxes to each item row
    for (const $itemRow of Item.getItemRows()) {
      const itemId = $itemRow.getId();
      $itemRow.append(Checkbox.makeCheckboxCell(itemId, this.personId));
    }

    // add one more cell to the add item row
    $("#add-item-row").append(makeHtml_("td", { class: this.personId }));

    // update the number of people
    Person.updateNumPeople();

    return true;
  }

  static remove(personId) {
    const name = Person.getNameOf(personId);
    if (!confirm(`Are you sure you want to remove person "${name}"?`)) {
      return false;
    }
    $(`.${personId}`).remove();
    Person.updateNumPeople();
    return true;
  }
}

class Item {
  static itemCounter_ = 0;

  static ROW_CLASS = "item-row";
  static PRICE_INPUT_CLASS = "item-price-input";

  static select_() {
    return $(`.${Item.ROW_CLASS}`);
  }

  static getRows_(func = null) {
    return Item.select_().mapEach(($element) =>
      func ? func($element) : $element
    );
  }

  static getItemRows() {
    return Item.getRows_();
  }

  static getIds() {
    return Item.getRows_(($element) => $element.getId());
  }

  static numItems() {
    return Item.select_().length;
  }

  static updateNumItems() {
    $("#num-items").text(Item.numItems());
  }

  static getLabelOf(itemId) {
    const $label = $(`#${itemId}-label`);
    if ($label.length === 0) return null;
    return $label.text();
  }

  static getItemPrices() {
    return Object.fromEntries(
      $(`.${Item.PRICE_INPUT_CLASS}`).mapEach(($input) => {
        const itemId = $input.attr("item");
        const price = getCentsVal($input);
        return [itemId, price];
      })
    );
  }

  constructor(label) {
    this.label = label || null;
    this.itemId = `item${Item.itemCounter_++}`;
  }

  makeDeleteCell_() {
    return makeHtml_("td", makeDeleteButton("Item", this.itemId));
  }

  makeLabelCell_() {
    return makeHtml_(
      "td",
      makeHtml_(
        "div",
        { class: ["row", "align-items-center", "gx-2", "gy-1"] },
        [
          makeHtml_("div", { id: `${this.itemId}-label`, class: ["col"] }),
          makeHtml_(
            "div",
            { class: ["col-auto"] },
            makeHtml_("div", { class: ["input-group", "flex-nowrap"] }, [
              makeHtml_("span", { class: ["input-group-text"] }, "$"),
              makeHtml_("input", {
                "type": "text",
                "inputmode": "decimal",
                "id": `${this.itemId}-price`,
                "item": this.itemId,
                "class": [
                  "form-control",
                  "dollar-input",
                  Item.PRICE_INPUT_CLASS,
                ],
                "value": "0.00",
                "oninput": "updateDollarValue(this);",
                "aria-label": "Item Price",
              }),
            ])
          ),
        ]
      )
    );
  }

  makeUnpaidCell_() {
    return makeHtml_("td", {
      id: `${this.itemId}-unpaid`,
      class: ["text-center"],
    });
  }

  add() {
    if (this.label == null) return false;

    const cells = [];
    // delete item button
    cells.push(this.makeDeleteCell_());
    // item label (will be populated later)
    cells.push(this.makeLabelCell_());
    // unpaid amount
    cells.push(this.makeUnpaidCell_());
    // toggle entire item
    cells.push(Checkbox.makeEntireToggleButton("item", this.itemId));
    // checkboxes
    for (const personId of Person.getIds()) {
      cells.push(Checkbox.makeCheckboxCell(this.itemId, personId));
    }

    // add the row
    const itemRow = $("<tr></tr>", { id: this.itemId, class: Item.ROW_CLASS });
    itemRow.html(cells.join(""));
    $("#add-item-row").before(itemRow);

    // set the text of the item label (escaped)
    $(`#${this.itemId}-label`).text(this.label);

    // update the number of items
    Item.updateNumItems();

    return true;
  }

  static remove(itemId) {
    const label = Item.getLabelOf(itemId);
    if (!confirm(`Are you sure you want to remove item "${label}"?`)) {
      return false;
    }
    $(`#${itemId}`).remove();
    Item.updateNumItems();
    return true;
  }
}

/**
 * Strips out all the non-numeric values in the given string and returns the
 * resulting value as an integer.
 */
function getInts(string, defaultValue = 0) {
  // properties are all strings anyway, so using an array is fine
  const DIGITS = Array.fromRange(10);
  let sawDigit = false;
  let num = 0;
  for (const char of string) {
    const digit = DIGITS[char];
    if (digit == null) continue;
    sawDigit = true;
    num = num * 10 + digit;
  }
  if (!sawDigit) return defaultValue;
  return num;
}

function getVal($input) {
  return $input.val()?.trim() ?? "";
}

function getCentsVal($input) {
  return getInts(getVal($input));
}

function getPercentageVal($input) {
  // limit the percentage to [0, 100)
  return getInts(getVal($input)) % 100;
}

function dollarStr(cents, dollarSign = false) {
  const centsStr = int(cents).toString().padStart(3, "0");
  const sign = dollarSign ? "$" : "";
  return `${sign}${centsStr.slice(0, -2)}.${centsStr.slice(-2)}`;
}

function updateSummary() {
  console.groupCollapsed("updating summary...");

  // get people
  const personIds = Person.getIds();
  console.group("people");
  console.log("num people:", personIds.length);
  console.log("ids:", personIds);
  console.groupEnd("people");

  // get items
  console.group("items");
  const itemIds = Item.getIds();
  console.log("num items:", itemIds.length);
  console.log("ids:", itemIds);

  // get costs for each item
  const itemCosts = Item.getItemPrices();
  const totalItemCost = int(
    Object.values(itemCosts).reduce((prev, curr) => prev + curr, 0)
  );
  // update total item cost
  $("#items-total").text(dollarStr(totalItemCost, true));
  console.log("costs:", itemCosts);
  console.log("total cost:", dollarStr(totalItemCost));
  console.groupEnd("items");

  console.group("globals");

  // find tax amount
  const $taxInput = $("#tax-input");
  const tax = getCentsVal($taxInput);
  $taxInput.toggleClass(
    "border-danger",
    (itemIds.length > 0 || personIds.length > 0) && tax === 0
  );
  console.log("tax:", dollarStr(tax, true));

  // update total tip with percentage
  console.group("tip with percentage");
  const includeTax = $("#include-tax-checkbox").prop("checked");
  console.log("include tax:", includeTax);
  const itemsAndTaxTotal = int(totalItemCost + (includeTax ? tax : 0));
  const tipPercentage = getPercentageVal($("#tip-percentage-input"));
  console.log("percentage:", tipPercentage);
  const totalTipWithPercentage = int((itemsAndTaxTotal * tipPercentage) / 100);
  $("#tip-total-with-percentage").text(dollarStr(totalTipWithPercentage, true));
  if (includeTax) {
    console.log(
      "total tip with percentage:",
      `(${dollarStr(totalItemCost, true)} + ${dollarStr(tax, true)}) ` +
        `* ${tipPercentage}% = ${dollarStr(totalTipWithPercentage, true)}`
    );
  } else {
    console.log(
      "total tip with percentage:",
      `${dollarStr(totalItemCost, true)} * ${tipPercentage}% ` +
        `= ${dollarStr(totalTipWithPercentage, true)}`
    );
  }
  console.groupEnd("tip with percentage");
  // update total tip with dollars
  console.group("tip with dollars");
  const totalTipWithDollars = getCentsVal($("#tip-dollars-input"));
  $("#tip-total-with-dollars").text(dollarStr(totalTipWithDollars, true));
  console.log("total tip with dollars:", dollarStr(totalTipWithDollars, true));
  console.groupEnd("tip with dollars");
  // update total tip
  const tipWithPercentage = $("#tip-with-percentage").prop("checked");
  let totalTip;
  if (tipWithPercentage) {
    totalTip = totalTipWithPercentage;
    $("#tip-total-with-percentage").addClass("fw-bold");
    $("#tip-total-with-dollars").removeClass("fw-bold");
    console.log(
      "tip with percentage selected; total tip:",
      dollarStr(totalTip, true)
    );
  } else {
    totalTip = totalTipWithDollars;
    $("#tip-total-with-percentage").removeClass("fw-bold");
    $("#tip-total-with-dollars").addClass("fw-bold");
    console.log(
      "tip with dollars selected; total tip:",
      dollarStr(totalTip, true)
    );
  }
  $("#total-tip").text(dollarStr(totalTip));

  const totalTaxTip = int(tax + totalTip);
  console.log(
    "tax + tip total:",
    `${dollarStr(tax, true)} + ${dollarStr(totalTip, true)} ` +
      `= ${dollarStr(totalTaxTip, true)}`
  );

  // update bill total
  const billTotal = int(totalItemCost + totalTaxTip);
  $("#bill-total").text(dollarStr(billTotal, true));
  console.log(
    "bill total:",
    `${dollarStr(totalItemCost, true)} + ${dollarStr(tax, true)} ` +
      `+ ${dollarStr(totalTip, true)} = ${dollarStr(billTotal, true)}`
  );
  console.groupEnd("globals");

  // find out who is checked for each item
  const checked = Checkbox.findAllChecked();
  console.log("checked:", checked);

  // calculate the amount per person for each item
  console.groupCollapsed("calculating price per item");
  const itemPricePerPerson = Object.fromArray(personIds, () => 0);
  let anyUnpaid = false;
  for (const [itemId, payingPeople] of Object.entries(checked)) {
    console.group(itemId);

    const $unpaid = $(`#${itemId}-unpaid`);
    $unpaid.html("");
    const $price = $(`#${itemId}-price`);
    $price.removeClass("border-danger");

    const itemCost = itemCosts[itemId];
    if (itemCost === 0) {
      if (payingPeople.length > 0) {
        // people are paying, but no price
        console.log("no price, but people checked");
        $price.addClass("border-danger");
      } else {
        console.log("no price");
      }
      console.groupEnd(itemId);
      continue;
    }
    if (payingPeople.length === 0) {
      // no one is paying for this item
      console.log("no people checked");
      anyUnpaid = true;
      $unpaid.html(makeBsBadge_("danger", dollarStr(itemCost, true)));
      console.groupEnd(itemId);
      continue;
    }
    console.log("people checked:", payingPeople);

    // calculate how much each person should pay
    const [perPerson, leftOver] = divmod(itemCost, payingPeople.length);
    console.log(
      "price per person:",
      `${dollarStr(itemCost, true)} / ${payingPeople.length} people ` +
        `= ${dollarStr(perPerson, true)}`
    );
    for (const personId of payingPeople) {
      itemPricePerPerson[personId] += perPerson;
    }
    if (leftOver > 0) {
      // some leftover cost that no one is paying for
      anyUnpaid = true;
      console.log("left over cost:", dollarStr(leftOver, true));
      $unpaid.html(makeBsBadge_("danger", dollarStr(leftOver, true)));
    }

    console.groupEnd(itemId);
  }
  // if there are any unpaid items, show the label; otherwise, hide it
  $(`#item-unpaid-column-label`).toggleClass("d-none", !anyUnpaid);
  console.groupEnd("calculating amount per item");

  // update the people's item prices
  let totalItemsPaid = 0;
  $(`.${Person.ITEM_PRICE_CLASS}`).forEach(($element) => {
    const personId = $element.attr("person");
    const personItemPrice = int(itemPricePerPerson[personId] ?? 0);
    itemPricePerPerson[personId] = personItemPrice;
    $element.text(dollarStr(personItemPrice, true));
    // if the person is not paying anything for items
    $element.toggleClass(
      "text-warning",
      totalItemCost > 0 && personItemPrice === 0
    );
    totalItemsPaid += personItemPrice;
  });
  console.log("item price per person:", itemPricePerPerson);

  // calculate the tax/tip prices per person
  console.groupCollapsed("calculating tax/tip price per person");
  const splitTaxTipEvenly = $("#split-tax-tip-evenly").prop("checked");
  const taxTipPricePerPerson = {};
  let totalTaxTipPaid;
  let totalTaxTipUnpaid;
  if (splitTaxTipEvenly) {
    console.log("splitting tax/tip evenly");
    if (personIds.length === 0) {
      // no people, so all tax/tip is unpaid
      console.log("no people");
      totalTaxTipUnpaid = totalTaxTip;
    } else {
      const [taxTipPerPerson, leftOver] = divmod(totalTaxTip, personIds.length);
      console.log(
        "tax/tip per person:",
        `${dollarStr(totalTaxTip, true)} / ${personIds.length} people ` +
          `= ${dollarStr(taxTipPerPerson, true)}`
      );
      for (const personId of personIds) {
        taxTipPricePerPerson[personId] = taxTipPerPerson;
      }
      totalTaxTipUnpaid = leftOver;
    }
    totalTaxTipPaid = int(totalTaxTip - totalTaxTipUnpaid);
  } else {
    // split proportionally
    console.log("splitting tax/tip proportionally");
    totalTaxTipPaid = 0;
    console.log("total items paid:", totalItemsPaid);
    if (totalItemsPaid > 0) {
      for (const [personId, personItemPrice] of Object.entries(
        itemPricePerPerson
      )) {
        console.group(personId);
        const proportion = personItemPrice / totalItemsPaid;
        console.log(
          "proportion:",
          `${dollarStr(personItemPrice, true)} ` +
            `/ ${dollarStr(totalItemsPaid, true)} = ${proportion}`
        );
        let personTaxTipPrice;
        if (proportion === 0) {
          personTaxTipPrice = 0;
        } else if (proportion === 1) {
          personTaxTipPrice = totalTaxTip;
        } else {
          personTaxTipPrice = int(proportion * totalTaxTip);
        }
        console.log(
          "tax/tip contribution:",
          `${dollarStr(totalTaxTip, true)} ` +
            `* ${(proportion * 100).toFixed(3)}% ` +
            `= ${dollarStr(personTaxTipPrice, true)}`
        );
        taxTipPricePerPerson[personId] = personTaxTipPrice;
        totalTaxTipPaid += personTaxTipPrice;
        console.groupEnd(personId);
      }
    } else {
      console.log("no one has paid for items, so can't split tax/tip");
    }
    totalTaxTipPaid = int(totalTaxTipPaid);
    totalTaxTipUnpaid = int(totalTaxTip - totalTaxTipPaid);
  }
  console.groupEnd("calculating tax/tip price per person");

  // update the people's tax/tip prices
  $(`.${Person.TAX_TIP_PRICE_CLASS}`).forEach(($element) => {
    const personId = $element.attr("person");
    const personTaxTipPrice = int(taxTipPricePerPerson[personId] ?? 0);
    taxTipPricePerPerson[personId] = personTaxTipPrice;
    $element.text(dollarStr(personTaxTipPrice, true));
  });
  console.log("tax/tip price per person:", taxTipPricePerPerson);

  // update the people's total price
  let totalPaid = 0;
  const totalPricePerPerson = {};
  $(`.${Person.TOTAL_PRICE_CLASS}`).forEach(($element) => {
    const personId = $element.attr("person");
    const personTotalPrice = int(
      (itemPricePerPerson[personId] ?? 0) +
        (taxTipPricePerPerson[personId] ?? 0)
    );
    totalPricePerPerson[personId] = personTotalPrice;
    $element.text(dollarStr(personTotalPrice, true));
    // if the price is 0, make the text red
    $element.toggleClass("text-danger", personTotalPrice === 0);
    totalPaid += personTotalPrice;
  });
  console.log("total price per person:", totalPricePerPerson);

  // update summary totals
  let anyTotalUnpaid = false;
  const summaryTotals = {};
  for (const [idPrefix, paid, unpaid] of [
    ["items-total", totalItemsPaid, int(totalItemCost - totalItemsPaid)],
    ["tax-tip", totalTaxTipPaid, totalTaxTipUnpaid],
    ["bill-total", totalPaid, int(billTotal - totalPaid)],
  ]) {
    summaryTotals[idPrefix] = { paid: paid / 100, unpaid: unpaid / 100 };
    $(`#${idPrefix}-paid`).text(dollarStr(paid, true));
    if (unpaid === 0) {
      $(`#${idPrefix}-unpaid`).html("");
    } else {
      anyTotalUnpaid = true;
      $(`#${idPrefix}-unpaid`).html(
        makeBsBadge_("danger", dollarStr(unpaid, true))
      );
    }
  }
  // if there are any unpaid totals, show the column; otherwise, hide it
  $(`.${SUMMARY_UNPAID_COLUMN_CLASS}`).toggleClass("d-none", !anyTotalUnpaid);
  console.group("summary totals");
  console.table(summaryTotals);
  console.groupEnd("summary totals");

  console.groupEnd();
}

function updateDollarValue(element) {
  const $input = $(element);
  $input.val(dollarStr(getCentsVal($input)));
  updateSummary();
}

function updatePercentageValue(element) {
  const $input = $(element);
  $input.val(getPercentageVal($input));
  updateSummary();
}

$(document).ready(() => {
  // reset button
  $("#reset-btn").click((event) => {
    if (!(Person.numPeople() === 0 && Item.numItems() === 0)) {
      if (!confirm("Are you sure you want to reset the page?")) return;
    }
    // reset the page by reloading it
    location.reload();
  });

  // tax input
  $("#tax-input").on("input", (event) => {
    updateDollarValue(event.target);
  });

  // select tip type
  $('input[type="radio"][name="tip"]').on("input", (event) => {
    updateSummary();
  });
  // tip percentage
  $("#tip-percentage-input").on("input", (event) => {
    updatePercentageValue(event.target);
  });
  // include tax in tip total checkbox
  $("#include-tax-checkbox").on("input", (event) => {
    updateSummary();
  });
  // tip dollars
  $("#tip-dollars-input").on("input", (event) => {
    updateDollarValue(event.target);
  });

  // select split tax/tip type
  $('input[type="radio"][name="split-tax-tip"]').on("input", (event) => {
    updateSummary();
  });

  function onInput(inputId, buttonId, callback) {
    const ENTER_KEY = 13;
    $(inputId).on("keypress", (event) => {
      if (event.which === ENTER_KEY) {
        callback($(inputId), $(buttonId));
      }
    });
    $(buttonId).click((event) => {
      callback($(inputId), $(buttonId));
    });
  }

  // adding a person
  onInput("#add-person-input", "#add-person-btn", ($input, $button) => {
    const name = getVal($input);
    // add the person
    updateOnSuccess_(() => new Person(name).add());
    // clear the input
    $input.val("");
  });

  // adding an item
  onInput("#add-item-input", "#add-item-btn", ($input, $button) => {
    const label = getVal($input);
    // add the item
    updateOnSuccess_(() => new Item(label).add());
    // clear the input
    $input.val("");
  });
});
