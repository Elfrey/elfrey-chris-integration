import {moduleNameShort} from './consts.js';

const mainJournalName = `${moduleNameShort} Результат`
const createJournalEntry = async (journalName = mainJournalName) => {
  return await JournalEntry.create({
    name: journalName,
    content: ``,
  });
};
const createJournalPage = async (journal, pageName) => {
  return await JournalEntryPage.create({
    name: pageName,
    sort: journal.pages.contents.length ? journal.pages.contents.at(-1).sort + CONST.SORT_INTEGER_DENSITY : 0
  }, {parent: journal})
}
const localize = (text) => game.i18n.localize(text);

export const updateJournal = async (actor, sourceData) => {

  let data = {
    spell: [],
    feat: [],
    ['class']: [],
    race: []
  };
  sourceData.forEach((item) => {
    const type = item.type === 'spell' ? item.type : item.system.type.value
    data[item.type === 'spell' ? item.type : item.system.type.value].push(item);
  });
  const journalData = []
  let mainJournal = game.journal.find(({name}) => name === mainJournalName);
  if (!mainJournal) {
    mainJournal = await createJournalEntry();
  }
  let page = mainJournal.pages.getName(actor.name);
  if (!page) {
    page = await createJournalPage(mainJournal, actor.name);
  }

  for (const list in data) {
    if (data[list].length > 0) {
      journalData.push(`<h3>${localize(`${moduleNameShort}.${list}`)}</h3><ul>`);
      data[list].forEach((item) =>
        journalData.push(`<li>@UUID[Actor.${actor.id}.Item.${item._id}]{${item.name}}</li>`)
      );
      journalData.push(`</ul>`);
    }
  }

  if (journalData.length > 0) {
    const content = `${page.text?.content || ''}<hr /><h2>${actor.name} (${actor.system.details.level} ${localize(`${moduleNameShort}.level`)}) - ${localize(`${moduleNameShort}.updatedFeatures`)}:</h2>${journalData.join('')}`;
    await page.update({
      'text.content': content
    });
  }
  return mainJournal;
}
