/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import Currency from './Currency';
import MessageAuthor from '../Components/Message/MessageAuthor';
import ChatStore from '../Stores/ChatStore';
import UserStore from '../Stores/UserStore';
import SupergroupStore from '../Stores/SupergroupStore';
import MessageStore from '../Stores/MessageStore';
import { t } from 'i18next';

let serviceMap = new Map();
serviceMap.set('messageBasicGroupChatCreate', 'messageBasicGroupChatCreate');
serviceMap.set('messageChatAddMembers', 'messageChatAddMembers');
serviceMap.set('messageChatChangePhoto', 'messageChatChangePhoto');
serviceMap.set('messageChatChangeTitle', 'messageChatChangeTitle');
serviceMap.set('messageChatDeleteMember', 'messageChatDeleteMember');
serviceMap.set('messageChatDeletePhoto', 'messageChatDeletePhoto');
serviceMap.set('messageChatJoinByLink', 'messageChatJoinByLink');
serviceMap.set('messageChatSetTtl', 'messageChatSetTtl');
serviceMap.set('messageChatUpgradeFrom', 'messageChatUpgradeFrom');
serviceMap.set('messageChatUpgradeTo', 'messageChatUpgradeTo');
serviceMap.set('messageContactRegistered', 'messageContactRegistered');
serviceMap.set('messageCustomServiceAction', 'messageCustomServiceAction');
serviceMap.set('messageGameScore', 'messageGameScore');
serviceMap.set('messagePassportDataReceived', 'messagePassportDataReceived');
serviceMap.set('messagePassportDataSent', 'messagePassportDataSent');
serviceMap.set('messagePaymentSuccessful', 'messagePaymentSuccessful');
serviceMap.set('messagePaymentSuccessfulBot', 'messagePaymentSuccessfulBot');
serviceMap.set('messagePinMessage', 'messagePinMessage');
serviceMap.set('messageScreenshotTaken', 'messageScreenshotTaken');
serviceMap.set('messageSupergroupChatCreate', 'messageSupergroupChatCreate');
serviceMap.set('messageUnsupported', 'messageUnsupported');
serviceMap.set('messageWebsiteConnected', 'messageWebsiteConnected');

function isServiceMessage(message) {
    if (!message) return false;
    if (!message.content) return false;

    return serviceMap.has(message.content['@type']) || message.ttl > 0;
}

function getTTLString(ttl) {
    if (ttl < 60) {
        return t('Seconds', ttl);
    }
    if (ttl < 60 * 60) {
        const minutes = Math.floor(ttl / 60);
        return t('Minutes', minutes);
    }
    if (ttl < 24 * 60 * 60) {
        const hours = Math.floor(ttl / 60 / 60);
        return t('Hours', hours);
    }
    if (ttl < 7 * 24 * 60 * 60) {
        const days = Math.floor(ttl / 60 / 60 / 24);
        return t('Days', days);
    }
    if (ttl >= 7 * 24 * 60 * 60) {
        const weeks = Math.floor(ttl / 60 / 60 / 24 / 7);
        return t('Weeks', weeks);
    }

    return t('Seconds', ttl);
}

function tFormatted(str) {
    const regexp = new RegExp('un([1-9])', 'g');
    const result = [];
    let match;
    let index = 0;
    while ((match = regexp.exec(str))) {
        const last = regexp.lastIndex - match[0].length;
        if (last > index) {
            result.push(str.substring(index, last));
        }

        const item = parseInt(match[1]);
        if (item < arguments.length) {
            result.push(arguments[item]);
        }
        index = regexp.lastIndex;
    }
    if (index < str.length - 1) {
        result.push(str.substring(index));
    }
    return result;
}

function getPassportElementTypeString(type) {
    switch (type['@type']) {
        case 'passportElementTypeAddress': {
            return t('ActionBotDocumentAddress');
        }
        case 'passportElementTypeBankStatement': {
            return t('ActionBotDocumentBankStatement');
        }
        case 'passportElementTypeDriverLicense': {
            return t('ActionBotDocumentDriverLicence');
        }
        case 'passportElementTypeEmailAddress': {
            return t('ActionBotDocumentEmail');
        }
        case 'passportElementTypeIdentityCard': {
            return t('ActionBotDocumentIdentityCard');
        }
        case 'passportElementTypeInternalPassport': {
            return t('ActionBotDocumentInternalPassport');
        }
        case 'passportElementTypePassport': {
            return t('ActionBotDocumentPassport');
        }
        case 'passportElementTypePassportRegistration': {
            return t('ActionBotDocumentPassportRegistration');
        }
        case 'passportElementTypePersonalDetails': {
            return t('ActionBotDocumentPersonalDetails');
        }
        case 'passportElementTypePhoneNumber': {
            return t('ActionBotDocumentPhoneNumber');
        }
        case 'passportElementTypeRentalAgreement': {
            return t('ActionBotDocumentRentalAgreement');
        }
        case 'passportElementTypeTemporaryRegistration': {
            return t('ActionBotDocumentTemporaryRegistration');
        }
        case 'passportElementTypeUtilityBill': {
            return t('ActionBotDocumentUtilityBill');
        }
    }

    return '';
}

function getMessageAuthor(message, openUser) {
    if (!message) return null;

    const { chat_id, sender_user_id } = message;

    if (sender_user_id !== 0) {
        return <MessageAuthor userId={sender_user_id} openUser={openUser} />;
    }

    const chat = ChatStore.get(chat_id);
    if (!chat) return null;

    return chat.title;
}

function getServiceMessageContent(message, openUser = false) {
    if (!message) return null;
    if (!message.content) return null;

    const isOutgoing = message.sender_user_id === UserStore.getMyId();
    const chat = ChatStore.get(message.chat_id);
    const isChannel = chat.type['@type'] === 'chatTypeSupergroup' && chat.type.is_channel;

    const { ttl, sender_user_id, content } = message;
    if (ttl > 0) {
        switch (content['@type']) {
            case 'messagePhoto': {
                if (isOutgoing) {
                    return t('OutgoingSelfdestructingPhotoMobile');
                }

                return (
                    <>
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                        {t('IncomingSelfdestructingPhotoMobile')}
                    </>
                );
            }
            case 'messageVideo': {
                if (isOutgoing) {
                    return t('OutgoingSelfdestructingVideoMobile');
                }

                return (
                    <>
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                        {t('IncomingSelfdestructingVideoMobile')}
                    </>
                );
            }
            default: {
                if (isOutgoing) {
                    return t('OutgoingSelfdestructingMessageMobile');
                }

                return (
                    <>
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                        {t('IncomingSelfdestructingMessageMobile')}
                    </>
                );
            }
        }
    }

    switch (content['@type']) {
        case 'messageBasicGroupChatCreate': {
            const { title } = ChatStore.get(message.chat_id);

            if (isOutgoing) {
                return `You created group «${title}»`;
            }

            return (
                <>
                    <MessageAuthor userId={sender_user_id} openUser={openUser} />
                    {` created group «${title}»`}
                </>
            );
        }
        case 'messageChatAddMembers': {
            const members = content.member_user_ids
                .map(x => <MessageAuthor key={x} userId={x} openUser={openUser} />)
                .reduce((accumulator, current, index, array) => {
                    const separator = index === array.length - 1 ? ' and ' : ', ';
                    return accumulator === null ? [current] : [...accumulator, separator, current];
                }, null);

            if (isOutgoing) {
                return content.member_user_ids.length === 1 && content.member_user_ids[0] === UserStore.getMyId() ? (
                    t('EventLogYouGroupJoined')
                ) : (
                    <>{tFormatted(t('ActionYouAddUser'), null, members)}</>
                );
            }

            return content.member_user_ids.length === 1 && content.member_user_ids[0] === message.sender_user_id ? (
                <>
                    {tFormatted(
                        t('ActionAddUserSelfMega'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                    )}
                </>
            ) : (
                <>
                    {tFormatted(
                        t('EventLogAdded'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />,
                        members
                    )}
                </>
            );
        }
        case 'messageChatChangePhoto': {
            if (isChannel) {
                return t('ActionChannelChangedPhoto');
            }

            if (isOutgoing) {
                return t('EventLogEditedYouChannelPhoto');
            }

            return (
                <>
                    {tFormatted(
                        t('EventLogEditedGroupPhoto'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                    )}
                </>
            );
        }
        case 'messageChatChangeTitle': {
            const { title } = content;

            if (isChannel) {
                return tFormatted(t('ActionChannelChangedTitle'), null, title);
            }

            if (isOutgoing) {
                return tFormatted(t('ActionYouChangedTitle'), null, title);
            }

            return (
                <>
                    {tFormatted(
                        t('ActionChangedTitle'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />,
                        title
                    )}
                </>
            );
        }
        case 'messageChatDeleteMember': {
            if (isOutgoing) {
                return content.user_id === UserStore.getMyId() ? (
                    t('ActionYouLeftUser')
                ) : (
                    <>
                        {tFormatted(
                            t('ActionYouKickUser'),
                            <MessageAuthor userId={content.user_id} openUser={openUser} />
                        )}
                    </>
                );
            }

            return content.user_id === sender_user_id ? (
                <>{tFormatted(t('EventLogLeft'), <MessageAuthor userId={sender_user_id} openUser={openUser} />)}</>
            ) : (
                <>
                    {tFormatted(
                        t('EventLogRemoved'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />,
                        <MessageAuthor userId={content.user_id} openUser={openUser} />
                    )}
                </>
            );
        }
        case 'messageChatDeletePhoto': {
            if (isChannel) {
                return t('ActionChannelRemovedPhoto');
            }

            if (isOutgoing) {
                return t('EventLogRemovedYouGroupPhoto');
            }

            return (
                <>
                    {tFormatted(t('ActionRemovedPhoto'), <MessageAuthor userId={sender_user_id} openUser={openUser} />)}
                </>
            );
        }
        case 'messageChatJoinByLink': {
            if (isOutgoing) {
                return t('ActionInviteYou');
            }

            return (
                <>{tFormatted(t('ActionInviteUser'), <MessageAuthor userId={sender_user_id} openUser={openUser} />)}</>
            );
        }
        case 'messageChatSetTtl': {
            const { ttl } = content;
            const ttlString = getTTLString(ttl);

            if (ttl <= 0) {
                if (isOutgoing) {
                    return t('MessageLifetimeYouRemoved');
                }

                return (
                    <>
                        {tFormatted(
                            t('MessageLifetimeRemoved'),
                            <MessageAuthor userId={sender_user_id} openUser={openUser} />
                        )}
                    </>
                );
            }

            if (isOutgoing) {
                return t('MessageLifetimeChangedOutgoing', ttlString);
            }

            return (
                <>
                    {tFormatted(
                        t('MessageLifetimeChanged'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />,
                        ttlString
                    )}
                </>
            );
        }
        case 'messageChatUpgradeFrom': {
            return t('ActionMigrateFromGroup');
        }
        case 'messageChatUpgradeTo': {
            return t('ActionMigrateToGroup');
        }
        case 'messageContactRegistered': {
            return (
                <>
                    {tFormatted(
                        t('ActionJoinedTelegram'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                    )}
                </>
            );
        }
        case 'messageCustomServiceAction': {
            return content.text;
        }
        case 'messageGameScore': {
            const messageGame = MessageStore.get(message.chat_id, content.game_message_id);
            if (
                messageGame &&
                messageGame.content &&
                messageGame.content['@type'] === 'messageGame' &&
                messageGame.content.game
            ) {
                const { game } = messageGame.content;

                if (isOutgoing) {
                    return t('ActionYouScoredInGame', content.score, game.title);
                }

                return (
                    <>
                        {t(
                            'ActionUserScored',
                            <MessageAuthor userId={messageGame.sender_user_id} openUser={openUser} />,
                            content.score,
                            game.title
                        )}
                    </>
                );
            }

            if (isOutgoing) {
                return t('ActionYouScored', content.score);
            }

            return (
                <>
                    {t(
                        'ActionUserScored',
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />,
                        content.score
                    )}
                </>
            );
        }
        case 'messagePassportDataReceived': {
            return 'Telegram Passport data received';
        }
        case 'messagePassportDataSent': {
            const chat = ChatStore.get(message.chat_id);

            const passportElementTypes = content.types
                .map(x => getPassportElementTypeString(x))
                .reduce((accumulator, current) => {
                    return accumulator === null ? [current] : [...accumulator, ', ', current];
                }, null);

            return (
                <>
                    {tFormatted(
                        t('ActionBotDocuments'),
                        <MessageAuthor userId={chat.type.user_id} openUser={openUser} />,
                        passportElementTypes
                    )}
                </>
            );
        }
        case 'messagePaymentSuccessful': {
            const chat = ChatStore.get(message.chat_id);

            const messageInvoice = MessageStore.get(message.chat_id, content.invoice_message_id);
            if (
                messageInvoice &&
                messageInvoice.content &&
                messageInvoice.content['@type'] === 'messageInvoice' &&
                messageInvoice.content.invoice
            ) {
                const { invoice } = messageInvoice.content;

                return (
                    <>
                        {`You have just successfully transferred ${Currency.getString(
                            content.total_amount,
                            content.currency
                        )} to `}
                        <MessageAuthor userId={chat.type.user_id} openUser={openUser} />
                        {` for ${invoice.title}`}
                    </>
                );
            }

            return (
                <>
                    {`You have just successfully transferred ${Currency.getString(
                        content.total_amount,
                        content.currency
                    )} to `}
                    <MessageAuthor userId={chat.type.user_id} openUser={openUser} />
                </>
            );
        }
        case 'messagePaymentSuccessfulBot': {
            return 'Payment successful';
        }
        case 'messagePinMessage': {
            const author = getMessageAuthor(message, openUser);
            const pinnedMessage = MessageStore.get(message.chat_id, content.message_id);
            if (!pinnedMessage || !pinnedMessage.content) {
                return <>{tFormatted(t('ActionPinnedNoText'), author)}</>;
            }

            let pinnedContent;
            if (isServiceMessage(pinnedMessage)) {
                pinnedContent = tFormatted(t('ActionPinnedNoText'), author);
            } else {
                switch (pinnedMessage.content['@type']) {
                    case 'messageAnimation': {
                        pinnedContent = tFormatted(t('ActionPinnedGif'), author);
                        break;
                    }
                    case 'messageAudio': {
                        pinnedContent = tFormatted(t('ActionPinnedMusic'), author);
                        break;
                    }
                    case 'messageCall': {
                        pinnedContent = tFormatted(t('ActionPinnedNoText'), author);
                        break;
                    }
                    case 'messageContact': {
                        pinnedContent = tFormatted(t('ActionPinnedContact'), author);
                        break;
                    }
                    case 'messageDocument': {
                        pinnedContent = tFormatted(t('ActionPinnedFile'), author);
                        break;
                    }
                    case 'messageExpiredPhoto': {
                        pinnedContent = tFormatted(t('ActionPinnedPhoto'), author);
                        break;
                    }
                    case 'messageExpiredVideo': {
                        pinnedContent = tFormatted(t('ActionPinnedVideo'), author);
                        break;
                    }
                    case 'messageGame': {
                        pinnedContent = tFormatted(t('ActionPinnedNoText'), author);
                        break;
                    }
                    case 'messageInvoice': {
                        pinnedContent = tFormatted(t('ActionPinnedNoText'), author);
                        break;
                    }
                    case 'messageLocation': {
                        pinnedContent = tFormatted(t('ActionPinnedGeo'), author);
                        break;
                    }
                    case 'messagePhoto': {
                        pinnedContent = tFormatted(t('ActionPinnedPhoto'), author);
                        break;
                    }
                    case 'messagePoll': {
                        pinnedContent = tFormatted(t('ActionPinnedPoll'), author);
                        break;
                    }
                    case 'messageSticker': {
                        pinnedContent = tFormatted(t('ActionPinnedSticker'), author);
                        break;
                    }
                    case 'messageText': {
                        const maxLength = 16;
                        const text = pinnedMessage.content.text.text;
                        if (text.length <= maxLength) {
                            pinnedContent = tFormatted(t('ActionPinnedText', text), author);
                        } else {
                            pinnedContent = tFormatted(
                                t('ActionPinnedText', text.substring(0, maxLength) + '…'),
                                author
                            );
                        }

                        break;
                    }
                    case 'messageUnsupported': {
                        pinnedContent = tFormatted(t('ActionPinnedNoText'), author);
                        break;
                    }
                    case 'messageVenue': {
                        pinnedContent = tFormatted(t('ActionPinnedGeo'), author);
                        break;
                    }
                    case 'messageVideo': {
                        pinnedContent = tFormatted(t('ActionPinnedVideo'), author);
                        break;
                    }
                    case 'messageVideoNote': {
                        pinnedContent = tFormatted(t('ActionPinnedRound'), author);
                        break;
                    }
                    case 'messageVoiceNote': {
                        pinnedContent = tFormatted(t('ActionPinnedVoice'), author);
                        break;
                    }
                }
            }

            return <>{pinnedContent}</>;
        }
        case 'messageScreenshotTaken': {
            if (isOutgoing) {
                return t('ActionTakeScreenshootYou');
            }

            return (
                <>
                    {tFormatted(
                        t('ActionTakeScreenshoot'),
                        <MessageAuthor userId={sender_user_id} openUser={openUser} />
                    )}
                </>
            );
        }
        case 'messageSupergroupChatCreate': {
            const { title } = content;

            if (isChannel) {
                return t('ActionCreateChannel');
            }

            if (isOutgoing) {
                return t('ActionYouCreateGroup');
            }

            return (
                <>{tFormatted(t('ActionCreateGroup'), <MessageAuthor userId={sender_user_id} openUser={openUser} />)}</>
            );
        }
        case 'messageUnsupported': {
            return t('UnsupportedMedia');
        }
        case 'messageWebsiteConnected': {
            return t('ActionBotAllowed', content.domain_name);
        }
    }

    return `[${message.content['@type']}]`;
}

export { isServiceMessage, getServiceMessageContent };
