import {moduleName, moduleNameShort, flagsName} from './consts.js';

class PickOptionWindow extends Application {
  constructor(data, onSelect, options = {}) {
    super(options);
    this.data = data;
    this.onSelect = onSelect;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: game.i18n.localize(`${moduleNameShort}.pickOptions`),
      width: 500,
      height: 'auto',
      resizable: true,
      id: `${moduleNameShort.toLowerCase()}-pick-options-window`,
      classes: [`${moduleNameShort.toLowerCase()}-pick-options-window`],
      template: `modules/${moduleName}/templates/pickOption.hbs`,
    });
  }

  getData() {

    const tmp = [];
    const section = this.data;
    for (name in section) {
      tmp.push({
        name: name,
        uuid: `Actor.${section[name].items[0].flags[flagsName].oldOwner}.Item.${section[name].items[0].flags[flagsName].oldId}`,
        items: [...section[name].items],
      });
    }
    return {
      data: tmp,
      onSelect: this.onSelect
    };
  }

  activateListeners(html) {
    super.activateListeners(html);


    html.find("#get-selected-items").click(() => {
      this.getSelectedItems(html);
    });

    this.setPosition({height: 'auto', width: 500});
  }

  async getSelectedItems(html) {
    const selectedItems = [];
    html.find('select').each((index, select) => {
      const selectedItem = select.value;
      selectedItems.push(selectedItem);
    });
    await this.onSelect(selectedItems);
    this.close();
  }
}


export default async (itemsData, onSelect) => {
  const pickOptionWindow = new PickOptionWindow(itemsData, onSelect);
  pickOptionWindow.render(true);
}
