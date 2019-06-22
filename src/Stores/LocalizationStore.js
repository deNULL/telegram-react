/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventEmitter } from 'events';
import Cookies from 'universal-cookie';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import sprintf from 'i18next-sprintf-postprocessor';
import LocalStorageBackend from 'i18next-localstorage-backend';
import { initReactI18next } from 'react-i18next';
import TdLibController from '../Controllers/TdLibController';
import dateFormat from 'dateformat';

const defaultLanguage = 'en';
const defaultNamespace = 'translation';
const cookies = new Cookies();
const language = cookies.get('i18next') || defaultLanguage;

// const detection = {
//     // order and from where user language should be detected
//     order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
//
//     // keys or params to lookup language from
//     lookupQuerystring: 'lng',
//     lookupCookie: 'i18next',
//     lookupLocalStorage: 'i18nextLng',
//     lookupFromPathIndex: 0,
//     lookupFromSubdomainIndex: 0,
//
//     // cache user language on
//     caches: ['localStorage', 'cookie']
// };

let overloadTranslationOptionHandler = args => {
    if (args.length > 1 && args[1] instanceof Array) {
        let options = args.length > 2 ? args[2] : {};
        options.postProcess = 'sprintf';
        options.sprintf = args[1];
        return options;
    } else {
        let values = [];

        for (var i = 1; i < args.length; i++) {
            values.push(args[i]);
        }

        return {
            postProcess: 'sprintf',
            sprintf: values,
            count: values[0]
        };
    }
};

i18n.use(initReactI18next) //.use(LanguageDetector) // passes i18n down to react-i18next
    .use(sprintf)
    .init({
        //detection: detection,
        ns: [defaultNamespace, 'local'],
        defaultNS: defaultNamespace,
        fallbackNS: ['local', 'emoji'],
        resources: {
            en: {
                local: {
                    DeletedMessage: 'Deleted message',
                    YourPhone: 'Your Phone',
                    StartText: 'Please confirm your country code and enter your phone number.',
                    Next: 'Next',
                    InvalidPhoneNumber: 'Invalid phone number. Please check the number and try again.',
                    More: 'More',
                    SendMessage: 'Send Message',
                    ChatInfo: 'Chat Info',
                    ChannelInfo: 'Channel Info',
                    StickersTab: 'STICKERS',
                    EmojiTab: 'EMOJI',

                    CallCancelled: 'Cancelled',
                    Offline: 'offline',
                    Ago: '%1$s ago',
                    Now: 'just now',

                    WeekSun: 'Sun',
                    WeekMon: 'Mon',
                    WeekTue: 'Tue',
                    WeekWed: 'Wed',
                    WeekThu: 'Thu',
                    WeekFri: 'Fri',
                    WeekSat: 'Sat',

                    PeopleNum: '%1$d person',
                    PeopleNum_plural: '%1$d people',
                    PersonAndPerson: '%1$s and %2$s',

                    Accent: 'Accent',
                    ThemeLight: 'Light',
                    ColorAmber: 'Amber',
                    ColorIndigo: 'Indigo',
                    ColorDeepPurple: 'Deep Purple',

                    SearchIn: 'Search messages in',
                    NoMessagesFound: 'No messages found',
                    MessagesFound: 'Found %1$d message',
                    MessagesFound_plural: 'Found %1$d messages',
                    SearchClear: 'Clear',

                    SendFiles: 'Are you sure you want to send files?',
                    SendFile: 'Are you sure you want to send file?',
                    PinMessage: 'Pin',

                    LoggingOut: 'Logging out…',

                    OutgoingSelfdestructingPhotoMobile:
                        'You sent a self-destructing photo. Please view it on your mobile',
                    IncomingSelfdestructingPhotoMobile: ' sent a self-destructing photo. Please view it on your mobile',
                    OutgoingSelfdestructingVideoMobile:
                        'You sent a self-destructing video. Please view it on your mobile',
                    IncomingSelfdestructingVideoMobile: ' sent a self-destructing video. Please view it on your mobile',
                    OutgoingSelfdestructingMessageMobile:
                        'You sent a self-destructing message. Please view it on your mobile',
                    IncomingSelfdestructingMessageMobile:
                        ' sent a self-destructing message. Please view it on your mobile',
                    ActionMigrateToGroup: 'Group migrated to a supergroup',
                    ActionJoinedTelegram: 'un1 just joined Telegram'
                },
                emoji: {
                    Search: 'Search',
                    NotEmojiFound: 'No Emoji Found',
                    ChooseDefaultSkinTone: 'Choose your default skin tone',
                    SearchResults: 'Search Results',
                    Recent: 'Frequently Used',
                    SmileysPeople: 'Smileys & People',
                    AnimalsNature: 'Animals & Nature',
                    FoodDrink: 'Food & Drink',
                    Activity: 'Activity',
                    TravelPlaces: 'Travel & Places',
                    Objects: 'Objects',
                    Symbols: 'Symbols',
                    Flags: 'Flags',
                    Custom: 'Custom'
                },
                translation: {
                    AppName: 'Telegram',
                    Loading: 'Loading',
                    Connecting: 'Connecting',
                    Updating: 'Updating'
                }
            },
            ru: {
                local: {
                    DeletedMessage: 'Удаленное сообщение',
                    YourPhone: 'Ваш телефон',
                    StartText: 'Пожалуйста, укажите код страны и свой номер телефона.',
                    Next: 'Далее',
                    InvalidPhoneNumber:
                        'Некорректный номер телефона. Пожалуйста, проверьте номер и попробуйте ещё раз.',
                    More: 'Ещё',
                    SendMessage: 'Отправить сообщение',
                    ChatInfo: 'Информация о чате',
                    ChannelInfo: 'Информация о канале',
                    StickersTab: 'СТИКЕРЫ',
                    EmojiTab: 'ЭМОДЗИ',

                    CallCancelled: 'Отменён',
                    Offline: 'не в сети',
                    Ago: '%1$s назад',
                    Now: 'только что',

                    WeekSun: 'Вс',
                    WeekMon: 'Пн',
                    WeekTue: 'Вт',
                    WeekWed: 'Ср',
                    WeekThu: 'Чт',
                    WeekFri: 'Пт',
                    WeekSat: 'Сб',

                    PeopleNum_0: '%1$d человек',
                    PeopleNum_1: '%1$d человека',
                    PeopleNum_2: '%1$d человек',
                    PersonAndPerson: '%1$s и %2$s',

                    Accent: 'Акцентный цвет',
                    ThemeLight: 'Светлая',
                    ColorAmber: 'Янтарный',
                    ColorIndigo: 'Индиго',
                    ColorDeepPurple: 'Пурпурный',

                    SearchIn: 'Поиск сообщений в',
                    NoMessagesFound: 'Сообщения не найдены',
                    MessagesFound_0: 'Найдено %1$d сообщение',
                    MessagesFound_1: 'Найдено %1$d сообщения',
                    MessagesFound_2: 'Найдено %1$d сообщений',
                    SearchClear: 'Очистить',

                    SendFiles: 'Вы уверены, что хотите отправить файлы?',
                    SendFile: 'Вы уверены, что хотите отправить файл?',
                    PinMessage: 'Закрепить',

                    LoggingOut: 'Завершение сеанса…',

                    OutgoingSelfdestructingPhotoMobile:
                        'Вы отправили самоуничтожающуюся фотографию. Вы можете просмотреть её в мобильном приложении',
                    IncomingSelfdestructingPhotoMobile:
                        ' отправил(а) самоуничтожающуюся фотографию. Вы можете просмотреть её в мобильном приложении',
                    OutgoingSelfdestructingVideoMobile:
                        'Вы отправили самоуничтожающееся видео. Вы можете просмотреть его в мобильном приложении',
                    IncomingSelfdestructingVideoMobile:
                        ' отправил(а) самоуничтожающееся видео. Вы можете просмотреть его в мобильном приложении',
                    OutgoingSelfdestructingMessageMobile:
                        'Вы отправили самоуничтожающееся сообщение. Вы можете просмотреть его в мобильном приложении',
                    IncomingSelfdestructingMessageMobile:
                        ' отправил(а) самоуничтожающееся сообщение. Вы можете просмотреть его в мобильном приложении',
                    ActionMigrateToGroup: 'Группа мигрировала в супергруппу',
                    ActionJoinedTelegram: 'un1 теперь в Telegram'
                },
                emoji: {
                    Search: 'Поиск',
                    NotEmojiFound: 'Эмодзи не найдены',
                    ChooseDefaultSkinTone: 'Выберите тон кожи по умолчанию',
                    SearchResults: 'Результаты поиска',
                    Recent: 'Часто используемые',
                    SmileysPeople: 'Смайлики и люди',
                    AnimalsNature: 'Животные и природа',
                    FoodDrink: 'Еда и напитки',
                    Activity: 'Активность',
                    TravelPlaces: 'Путешествия и местности',
                    Objects: 'Предметы',
                    Symbols: 'Символы',
                    Flags: 'Флаги',
                    Custom: 'Пользовательские'
                },
                translation: {
                    AppName: 'Телеграм',
                    Loading: 'Загрузка',
                    Connecting: 'Соединение',
                    Updating: 'Обновление'
                }
            }
        },
        lng: language,
        fallbackLng: defaultLanguage,
        interpolation: {
            escapeValue: false
        },
        react: {
            wait: false
        },
        overloadTranslationOptionHandler
    });

const cache = new LocalStorageBackend(null, {
    enabled: true,
    prefix: 'i18next_res_',
    expirationTime: Infinity
});

const translationDefaultLng = cache.read(defaultLanguage, defaultNamespace, (err, data) => {
    return data;
});
const translationCurrentLng = cache.read(language, defaultNamespace, (err, data) => {
    return data;
});
i18n.addResourceBundle(defaultLanguage, defaultNamespace, translationDefaultLng);
i18n.addResourceBundle(language, defaultNamespace, translationCurrentLng);

class LocalizationStore extends EventEmitter {
    constructor() {
        super();

        this.i18n = i18n;
        this.cache = cache;

        this.setMaxListeners(Infinity);
        this.addTdLibListener();
    }

    addTdLibListener = () => {
        TdLibController.addListener('update', this.onUpdate);
        TdLibController.addListener('clientUpdate', this.onClientUpdate);
    };

    removeTdLibListener = () => {
        TdLibController.removeListener('update', this.onUpdate);
        TdLibController.removeListener('clientUpdate', this.onClientUpdate);
    };

    onUpdate = update => {
        switch (update['@type']) {
            case 'updateAuthorizationState': {
                switch (update.authorization_state['@type']) {
                    case 'authorizationStateWaitTdlibParameters':
                        TdLibController.send({
                            '@type': 'setOption',
                            name: 'localization_target',
                            value: { '@type': 'optionValueString', value: 'android' }
                        });
                        TdLibController.send({
                            '@type': 'setOption',
                            name: 'language_pack_id',
                            value: { '@type': 'optionValueString', value: language }
                        });
                        TdLibController.send({
                            '@type': 'getLocalizationTargetInfo',
                            only_local: false
                        }).then(result => {
                            this.info = result;

                            TdLibController.clientUpdate({
                                '@type': 'clientUpdateLanguageChange',
                                language: language
                            });
                        });
                        break;
                }
                break;
            }
            case 'updateLanguagePackStrings': {
                // add/remove new strings

                this.emit('updateLanguagePackStrings', update);
                break;
            }
        }
    };

    onClientUpdate = async update => {
        switch (update['@type']) {
            case 'clientUpdateLanguageChange': {
                const { language } = update;

                TdLibController.send({
                    '@type': 'getLanguagePackStrings',
                    language_pack_id: language,
                    keys: []
                }).then(async result => {
                    const cookies = new Cookies();
                    cookies.set('i18next', language);

                    const resources = this.processStrings(language, result);

                    this.cache.save(language, defaultNamespace, resources);

                    i18n.addResourceBundle(language, defaultNamespace, resources);

                    await i18n.changeLanguage(language);

                    dateFormat.i18n.dayNames[0] = i18n.t('WeekSun');
                    dateFormat.i18n.dayNames[1] = i18n.t('WeekMon');
                    dateFormat.i18n.dayNames[2] = i18n.t('WeekTue');
                    dateFormat.i18n.dayNames[3] = i18n.t('WeekWed');
                    dateFormat.i18n.dayNames[4] = i18n.t('WeekThu');
                    dateFormat.i18n.dayNames[5] = i18n.t('WeekFri');
                    dateFormat.i18n.dayNames[6] = i18n.t('WeekSat');

                    TdLibController.send({
                        '@type': 'setOption',
                        name: 'language_pack_id',
                        value: { '@type': 'optionValueString', value: language }
                    });

                    this.emit('clientUpdateLanguageChange', update);
                });
                break;
            }
        }
    };

    processStrings = (lng, languagePackStrings) => {
        function processString(value) {
            return value.replace(/\*\*/g, ''); // TODO: enable bold font in localized strings
        }
        if (!languagePackStrings) return {};
        const { strings } = languagePackStrings;
        if (!strings) return {};

        let result = {};
        for (let i = 0; i < strings.length; i++) {
            const { value } = strings[i];
            switch (value['@type']) {
                case 'languagePackStringValueOrdinary': {
                    result[strings[i].key] = processString(value.value);
                    break;
                }
                case 'languagePackStringValuePluralized': {
                    // TODO: this mapping is probably broken for many, many languages
                    // Using indexes instead of unicode plural categories is a terrible practice
                    result[strings[i].key] = result[strings[i].key + '_0'] = processString(value.one_value);

                    if (value.few_value) {
                        result[strings[i].key + '_1'] = processString(value.few_value);
                    }
                    if (value.other_value) {
                        result[strings[i].key + '_plural'] = result[strings[i].key + '_2'] = processString(
                            value.other_value
                        );
                    }
                    if (value.many_value) {
                        result[strings[i].key + '_2'] = processString(value.many_value);
                    }
                    break;
                }
                case 'languagePackStringValueDeleted': {
                    break;
                }
            }
        }

        return result;
    };

    loadLanguage = async language => {
        const result = await TdLibController.send({
            '@type': 'getLanguagePackStrings',
            language_pack_id: language,
            keys: []
        });

        const resources = this.processStrings(language, result);

        this.cache.save(language, defaultNamespace, resources);

        i18n.addResourceBundle(language, defaultNamespace, resources);
    };
}

const store = new LocalizationStore();
window.localization = store;
export default store;
