/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import dateFormat from 'dateformat';
import Audio from '../Components/Message/Media/Audio';
import Animation from '../Components/Message/Media/Animation';
import Contact from '../Components/Message/Media/Contact';
import Document from '../Components/Message/Media/Document';
import Game from '../Components/Message/Media/Game';
import Location from '../Components/Message/Media/Location';
import Photo from '../Components/Message/Media/Photo';
import Poll from '../Components/Message/Media/Poll';
import Sticker from '../Components/Message/Media/Sticker';
import Venue from '../Components/Message/Media/Venue';
import Video from '../Components/Message/Media/Video';
import VideoNote from '../Components/Message/Media/VideoNote';
import VoiceNote from '../Components/Message/Media/VoiceNote';
import Call from '../Components/Message/Media/Call';
import { getChatTitle } from './Chat';
import { openUser } from './../Actions/Client';
import { getPhotoSize, getSize, getDurationApproximateString } from './Common';
import { download, saveOrDownload } from './File';
import { getAudioTitle } from './Media';
import { getServiceMessageContent } from './ServiceMessage';
import { getUserFullName } from './User';
import { LOCATION_HEIGHT, LOCATION_SCALE, LOCATION_WIDTH, LOCATION_ZOOM } from '../Constants';
import ApplicationStore from '../Stores/ApplicationStore';
import ChatStore from '../Stores/ChatStore';
import FileStore from '../Stores/FileStore';
import MessageStore from '../Stores/MessageStore';
import UserStore from '../Stores/UserStore';
import TdLibController from '../Controllers/TdLibController';

function getAuthor(message) {
    if (!message) return null;

    const { forward_info } = message;

    if (forward_info) {
        switch (forward_info['@type']) {
            case 'messageForwardedFromUser': {
                if (forward_info.sender_user_id > 0) {
                    const user = UserStore.get(forward_info.sender_user_id);
                    if (user) {
                        return getUserFullName(user);
                    }
                }
                break;
            }
            case 'messageForwardedPost': {
                const chat = ChatStore.get(forward_info.chat_id);
                if (chat) {
                    return chat.title;
                }
                break;
            }
        }
    }

    return getTitle(message);
}

function getTitle(message) {
    if (!message) return null;

    const { sender_user_id, chat_id } = message;

    if (sender_user_id) {
        const user = UserStore.get(sender_user_id);
        if (user) {
            return getUserFullName(user);
        }
    }

    if (chat_id) {
        const chat = ChatStore.get(chat_id);
        if (chat) {
            return chat.title;
        }
    }

    return null;
}

function substring(text, start, end) {
    if (start < 0) start = 0;
    if (start > text.length - 1) start = text.length - 1;
    if (end < start) end = start;
    if (end > text.length) end = text.length;

    return text.substring(start, end);
}

function stopPropagation(event) {
    event.stopPropagation();
}

function getFormattedText(text, onLinkClick) {
    if (text['@type'] !== 'formattedText') return null;
    if (!text.text) return null;
    if (!text.entities) return text.text;

    onLinkClick = onLinkClick || stopPropagation;

    let result = [];
    let index = 0;
    for (let i = 0; i < text.entities.length; i++) {
        let beforeEntityText = substring(text.text, index, text.entities[i].offset);
        if (beforeEntityText) {
            result.push(beforeEntityText);
        }

        let entityText = substring(
            text.text,
            text.entities[i].offset,
            text.entities[i].offset + text.entities[i].length
        );
        switch (text.entities[i].type['@type']) {
            case 'textEntityTypeUrl': {
                let url = entityText.startsWith('http') ? entityText : 'http://' + entityText;
                let decodedUrl;
                try {
                    decodedUrl = decodeURI(entityText);
                } catch (error) {
                    console.error('uri: ' + entityText + '\n' + error);
                    decodedUrl = entityText;
                }

                result.push(
                    <a
                        key={text.entities[i].offset}
                        onClick={onLinkClick}
                        href={url}
                        title={url}
                        target='_blank'
                        rel='noopener noreferrer'>
                        {decodedUrl}
                    </a>
                );
                break;
            }
            case 'textEntityTypeTextUrl': {
                let url = text.entities[i].type.url.startsWith('http')
                    ? text.entities[i].type.url
                    : 'http://' + text.entities[i].type.url;
                result.push(
                    <a
                        key={text.entities[i].offset}
                        onClick={onLinkClick}
                        href={url}
                        title={url}
                        target='_blank'
                        rel='noopener noreferrer'>
                        {entityText}
                    </a>
                );
                break;
            }
            case 'textEntityTypeBold':
                result.push(<strong key={text.entities[i].offset}>{entityText}</strong>);
                break;
            case 'textEntityTypeItalic':
                result.push(<em key={text.entities[i].offset}>{entityText}</em>);
                break;
            case 'textEntityTypeCode':
                result.push(<code key={text.entities[i].offset}>{entityText}</code>);
                break;
            case 'textEntityTypePre':
                result.push(
                    <pre key={text.entities[i].offset}>
                        <code>{entityText}</code>
                    </pre>
                );
                break;
            case 'textEntityTypeMention':
                let username = entityText.length > 0 && entityText[0] === '@' ? substring(entityText, 1) : entityText;
                result.push(
                    <a key={text.entities[i].offset} onClick={onLinkClick} href={`tg://resolve?domain=${username}`}>
                        {entityText}
                    </a>
                );
                break;
            case 'textEntityTypeMentionName':
                result.push(
                    <a
                        key={text.entities[i].offset}
                        onClick={onLinkClick}
                        href={`tg://user?id=${text.entities[i].type.user_id}`}>
                        {entityText}
                    </a>
                );
                break;
            case 'textEntityTypeHashtag':
                let hashtag = entityText.length > 0 && entityText[0] === '#' ? substring(entityText, 1) : entityText;
                result.push(
                    <a
                        key={text.entities[i].offset}
                        onClick={onLinkClick}
                        href={`tg://search_hashtag?hashtag=${hashtag}`}>
                        {entityText}
                    </a>
                );
                break;
            case 'textEntityTypeEmailAddress':
                result.push(
                    <a
                        key={text.entities[i].offset}
                        onClick={stopPropagation}
                        href={`mailto:${entityText}`}
                        target='_blank'
                        rel='noopener noreferrer'>
                        {entityText}
                    </a>
                );
                break;
            case 'textEntityTypeBotCommand':
                let command = entityText.length > 0 && entityText[0] === '/' ? substring(entityText, 1) : entityText;
                result.push(
                    <a key={text.entities[i].offset} onClick={onLinkClick} href={`tg://bot_command?command=${command}`}>
                        {entityText}
                    </a>
                );
                break;
            default:
                result.push(entityText);
                break;
        }

        index += beforeEntityText.length + entityText.length;
    }

    if (index < text.text.length) {
        let afterEntityText = text.text.substring(index);
        if (afterEntityText) {
            result.push(afterEntityText);
        }
    }

    return result;
}

function getText(message, onLinkClick) {
    if (!message) return null;

    let text = [];

    const { content } = message;

    if (
        content &&
        content['@type'] === 'messageText' &&
        content.text &&
        content.text['@type'] === 'formattedText' &&
        content.text.text
    ) {
        text = getFormattedText(content.text, onLinkClick);
    } else {
        //text.push('[' + message.content['@type'] + ']');//JSON.stringify(x);
        if (content && content.caption && content.caption['@type'] === 'formattedText' && content.caption.text) {
            text.push('\n');
            let formattedText = getFormattedText(content.caption, onLinkClick);
            if (formattedText) {
                text = text.concat(formattedText);
            }
        }
    }

    return text;
}

function getWebPage(message) {
    if (!message) return null;
    if (!message.content) return null;

    return message.content.web_page;
}

function getDate(message) {
    if (!message) return null;
    if (!message.date) return null;

    let date = new Date(message.date * 1000);

    return dateFormat(date, 'H:MM'); //date.toDateString();
}

function getDateHint(message) {
    if (!message) return null;
    if (!message.date) return null;

    const date = new Date(message.date * 1000);
    return dateFormat(date, 'H:MM:ss d.mm.yyyy'); //date.toDateString();
}

function getMedia(message, openMedia) {
    if (!message) return null;

    const { chat_id, id, content } = message;
    if (!content) return null;

    switch (content['@type']) {
        case 'messageAnimation':
            return <Animation chatId={chat_id} messageId={id} animation={content.animation} openMedia={openMedia} />;
        case 'messageAudio':
            return <Audio chatId={chat_id} messageId={id} audio={content.audio} openMedia={openMedia} />;
        case 'messageContact':
            return <Contact chatId={chat_id} messageId={id} contact={content.contact} openMedia={openMedia} />;
        case 'messageDocument':
            return <Document chatId={chat_id} messageId={id} document={content.document} openMedia={openMedia} />;
        case 'messageGame':
            return <Game chatId={chat_id} messageId={id} game={content.game} openMedia={openMedia} />;
        case 'messageLocation':
            return <Location chatId={chat_id} messageId={id} location={content.location} openMedia={openMedia} />;
        case 'messagePhoto':
            return <Photo chatId={chat_id} messageId={id} photo={content.photo} openMedia={openMedia} />;
        case 'messagePoll':
            return <Poll chatId={chat_id} messageId={id} poll={content.poll} openMedia={openMedia} />;
        case 'messageSticker':
            return <Sticker chatId={chat_id} messageId={id} sticker={content.sticker} openMedia={openMedia} />;
        case 'messageText':
            return null;
        case 'messageVenue':
            return <Venue chatId={chat_id} messageId={id} venue={content.venue} openMedia={openMedia} />;
        case 'messageVideo':
            return <Video chatId={chat_id} messageId={id} video={content.video} openMedia={openMedia} />;
        case 'messageVideoNote':
            return <VideoNote chatId={chat_id} messageId={id} videoNote={content.video_note} openMedia={openMedia} />;
        case 'messageVoiceNote':
            return <VoiceNote chatId={chat_id} messageId={id} voiceNote={content.voice_note} openMedia={openMedia} />;
        case 'messageCall':
            return <Call chatId={chat_id} messageId={id} call={message} openMedia={openMedia} />;
        default:
            return '[' + content['@type'] + ']';
    }
}

function isForwardOriginHidden(forwardInfo) {
    if (!forwardInfo) return false;

    const { origin } = forwardInfo;
    if (!origin) return false;

    switch (origin['@type']) {
        case 'messageForwardOriginUser': {
            return false;
        }
        case 'messageForwardOriginHiddenUser': {
            return true;
        }
        case 'messageForwardOriginChannel': {
            return false;
        }
    }

    return false;
}

function getForwardTitle(forwardInfo, t = key => key) {
    if (!forwardInfo) return '';

    const { origin } = forwardInfo;
    if (!origin) return '';

    switch (origin['@type']) {
        case 'messageForwardOriginUser': {
            const { sender_user_id } = origin;

            const user = UserStore.get(sender_user_id);
            return getUserFullName(user);
        }
        case 'messageForwardOriginHiddenUser': {
            const { sender_name } = origin;

            return sender_name;
        }
        case 'messageForwardOriginChannel': {
            const { chat_id, author_signature } = origin;

            return getChatTitle(chat_id, false, t) + (author_signature ? ` (${author_signature})` : '');
        }
    }

    return '';
}

function getUnread(message) {
    if (!message) return false;
    if (!message.chat_id) return false;
    if (!message.is_outgoing) return false;

    let chat = ChatStore.get(message.chat_id);
    if (!chat) return false;

    return chat.last_read_outbox_message_id < message.id;
}

function getSenderUserId(message) {
    if (!message) return null;

    return message.sender_user_id;
}

function filterMessages(result, history) {
    if (result.messages.length === 0) return;
    if (history.length === 0) return;

    const map = history.reduce(function(accumulator, current) {
        accumulator.set(current.id, current.id);
        return accumulator;
    }, new Map());

    result.messages = result.messages.filter(x => !map.has(x.id));
}

function isMessageCallCancelled(call) {
    return ['callDiscardReasonMissed', 'callDiscardReasonDeclined'].includes(call.discard_reason['@type']);
}

function getMessageCallType(message, t) {
    if (message.is_outgoing) {
        if (isMessageCallCancelled(message.content)) {
            return t('CallMessageOutgoingMissed');
        } else {
            return t('CallMessageOutgoing');
        }
    } else {
        if (isMessageCallCancelled(message.content)) {
            return t('CallMessageIncomingMissed');
        } else {
            return t('CallMessageIncoming');
        }
    }
}

function getContent(message, t = key => key) {
    if (!message) return null;

    const { content } = message;
    if (!content) return null;

    let caption = '';
    if (content.caption && content.caption.text) {
        caption = `, ${content.caption.text}`;
    }

    if (message.ttl > 0) {
        return getServiceMessageContent(message);
    }

    switch (content['@type']) {
        case 'messageAnimation': {
            return t('AttachGif') + caption;
        }
        case 'messageAudio': {
            return t('AttachMusic') + caption;
        }
        case 'messageBasicGroupChatCreate': {
            return getServiceMessageContent(message);
        }
        case 'messageCall': {
            const callType = getMessageCallType(message, t);
            const duration = getDurationApproximateString(content.duration, t);
            return duration ? t('CallMessageWithDuration', callType, duration) : callType;
        }
        case 'messageChatAddMembers': {
            return getServiceMessageContent(message);
        }
        case 'messageChatChangePhoto': {
            return getServiceMessageContent(message);
        }
        case 'messageChatChangeTitle': {
            return getServiceMessageContent(message);
        }
        case 'messageChatDeleteMember': {
            return getServiceMessageContent(message);
        }
        case 'messageChatDeletePhoto': {
            return getServiceMessageContent(message);
        }
        case 'messageChatJoinByLink': {
            return getServiceMessageContent(message);
        }
        case 'messageChatSetTtl': {
            return getServiceMessageContent(message);
        }
        case 'messageChatUpgradeFrom': {
            return getServiceMessageContent(message);
        }
        case 'messageChatUpgradeTo': {
            return getServiceMessageContent(message);
        }
        case 'messageContact': {
            return t('AttachContact') + caption;
        }
        case 'messageContactRegistered': {
            return getServiceMessageContent(message);
        }
        case 'messageCustomServiceAction': {
            return getServiceMessageContent(message);
        }
        case 'messageDocument': {
            return t('AttachDocument') + caption;
        }
        case 'messageExpiredPhoto': {
            return t('AttachPhoto') + caption;
        }
        case 'messageExpiredVideo': {
            return t('AttachVideo') + caption;
        }
        case 'messageGame': {
            return t('AttachGame') + caption;
        }
        case 'messageGameScore': {
            return getServiceMessageContent(message);
        }
        case 'messageInvoice': {
            return getServiceMessageContent(message);
        }
        case 'messageLocation': {
            return t('AttachLocation') + caption;
        }
        case 'messagePassportDataReceived': {
            return getServiceMessageContent(message);
        }
        case 'messagePassportDataSent': {
            return getServiceMessageContent(message);
        }
        case 'messagePaymentSuccessful': {
            return getServiceMessageContent(message);
        }
        case 'messagePaymentSuccessfulBot': {
            return getServiceMessageContent(message);
        }
        case 'messagePhoto': {
            return t('AttachPhoto') + caption;
        }
        case 'messagePoll': {
            const { poll } = content;

            return '📊 ' + (poll.question || t('Poll')) + caption;
        }
        case 'messagePinMessage': {
            return getServiceMessageContent(message);
        }
        case 'messageScreenshotTaken': {
            return getServiceMessageContent(message);
        }
        case 'messageSticker': {
            const { sticker } = content;
            let emoji = '';
            if (sticker && sticker.emoji) {
                emoji = sticker.emoji;
            }

            return t('AttachSticker') + (emoji ? ` ${emoji}` : '') + caption;
        }
        case 'messageSupergroupChatCreate': {
            return getServiceMessageContent(message);
        }
        case 'messageText': {
            return content.text.text + caption;
        }
        case 'messageUnsupported': {
            return getServiceMessageContent(message);
        }
        case 'messageVenue': {
            return t('AttachLocation') + caption;
        }
        case 'messageVideo': {
            return t('AttachVideo') + caption;
        }
        case 'messageVideoNote': {
            return t('AttachRound') + caption;
        }
        case 'messageVoiceNote': {
            return t('AttachAudio') + caption;
        }
        case 'messageWebsiteConnected': {
            return getServiceMessageContent(message);
        }
        default: {
            return t('UnsupportedAttachment');
        }
    }
}

function isMediaContent(content) {
    if (!content) return false;

    return content['@type'] === 'messagePhoto';
}

function getLocationId(location) {
    if (!location) return null;

    const { longitude, latitude } = location;
    return `loc=${latitude},${longitude}&size=${LOCATION_WIDTH},${LOCATION_HEIGHT}&scale=${LOCATION_SCALE}&zoom=${LOCATION_ZOOM}`;
}

function isVideoMessage(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return false;

    const { content } = message;
    if (!content) return false;

    switch (content['@type']) {
        case 'messageVideo': {
            return true;
        }
        case 'messageText': {
            const { web_page } = content;
            return Boolean(web_page.video);
        }
        default: {
            return false;
        }
    }
}

function isLottieMessage(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return false;

    const { content } = message;
    if (!content) return false;

    switch (content['@type']) {
        case 'messageDocument': {
            const { document } = content;
            if (!document) return false;

            const { file_name } = document;

            return file_name && file_name.toLowerCase().endsWith('.json');
        }
        case 'messageText': {
            const { web_page } = content;
            if (!web_page) return false;

            const { document } = web_page;
            if (!document) return false;

            const { file_name } = document;

            return file_name && file_name.toLowerCase().endsWith('.json');
        }
        default: {
            return false;
        }
    }
}

function isAnimationMessage(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return false;

    const { content } = message;
    if (!content) return false;

    switch (content['@type']) {
        case 'messageAnimation': {
            return true;
        }
        case 'messageText': {
            const { web_page } = content;
            return Boolean(web_page.animation);
        }
        default: {
            return false;
        }
    }
}

function isContentOpened(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return true;

    const { content } = message;
    if (!content) return true;

    switch (content['@type']) {
        case 'messageVoiceNote': {
            return content.is_listened;
        }
        case 'messageVideoNote': {
            return content.is_viewed;
        }
        default: {
            return true;
        }
    }
}

function getMediaTitle(message) {
    if (!message) return null;

    const { content } = message;
    if (!content) return null;

    switch (content['@type']) {
        case 'messageAudio': {
            const { audio } = content;
            if (audio) {
                return getAudioTitle(audio);
            }
            break;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { audio } = web_page;
                if (audio) {
                    return getAudioTitle(audio);
                }
                break;
            }
        }
    }

    return getAuthor(message);
}

function hasAudio(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return false;

    const { content } = message;
    if (!content) return false;

    switch (content['@type']) {
        case 'messageAudio': {
            const { audio } = content;
            if (audio) {
                return true;
            }

            break;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { audio } = web_page;
                if (audio) {
                    return true;
                }
            }

            break;
        }
    }

    return false;
}

function hasVideoNote(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return false;

    const { content } = message;
    if (!content) return false;

    switch (content['@type']) {
        case 'messageVideoNote': {
            const { video_note } = content;
            if (video_note) {
                return true;
            }

            break;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { video_note } = web_page;
                if (video_note) {
                    return true;
                }
            }

            break;
        }
    }

    return false;
}

function getSearchMessagesFilter(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return null;

    const { content } = message;
    if (!content) return null;

    switch (content['@type']) {
        case 'messageAudio': {
            const { audio } = content;
            if (audio) {
                return {
                    '@type': 'searchMessagesFilterAudio'
                };
            }
            break;
        }
        case 'messageVoiceNote': {
            const { voice_note } = content;
            if (voice_note) {
                return {
                    '@type': 'searchMessagesFilterVoiceNote'
                };
            }
            break;
        }
        case 'messageVideoNote': {
            const { video_note } = content;
            if (video_note) {
                return null;

                return {
                    '@type': 'searchMessagesFilterVideoNote'
                };
            }
            break;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { audio, voice_note, video_note } = web_page;
                if (audio) {
                    return null;

                    return {
                        '@type': 'searchMessagesFilterAudio'
                    };
                }

                if (voice_note) {
                    return null;

                    return {
                        '@type': 'searchMessagesFilterVoiceNote'
                    };
                }

                if (video_note) {
                    return null;

                    return {
                        '@type': 'searchMessagesFilterVideoNote'
                    };
                }
                break;
            }
        }
    }

    return null;
}

function openAnimation(animation, message, fileCancel) {
    if (!animation) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { animation: file } = animation;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    // download file at loadMediaViewerContent instead
    // download(file, message, FileStore.updateAnimationBlob(chat_id, id, file.id));

    TdLibController.clientUpdate({
        '@type': 'clientUpdateActiveAnimation',
        chatId: chat_id,
        messageId: id
    });

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    ApplicationStore.setMediaViewerContent({
        chatId: chat_id,
        messageId: id
    });
}

function openAudio(audio, message, fileCancel) {
    if (!audio) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { audio: file } = audio;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    } else {
        download(file, message, () => FileStore.updateAudioBlob(chat_id, id, file.id));
    }

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    TdLibController.clientUpdate({
        '@type': 'clientUpdateMediaActive',
        chatId: chat_id,
        messageId: id
    });
}

function openChatPhoto(photo, message, fileCancel) {
    if (!photo) return;
    if (!message) return;

    const { chat_id, id } = message;

    const photoSize = getPhotoSize(photo.sizes);
    if (!photoSize) return;

    let { photo: file } = photoSize;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    download(file, message, () => FileStore.updatePhotoBlob(chat_id, id, file.id));

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    ApplicationStore.setMediaViewerContent({
        chatId: chat_id,
        messageId: id
    });
}

function openContact(contact, message, fileCancel) {
    if (!contact) return;
    if (!message) return;

    const { chat_id, id } = message;

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    openUser(contact.userId);
}

function openDocument(document, message, fileCancel) {
    if (!document) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { document: file } = document;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    if (isLottieMessage(chat_id, id)) {
        TdLibController.send({
            '@type': 'openMessageContent',
            chat_id: chat_id,
            message_id: id
        });

        ApplicationStore.setMediaViewerContent({
            chatId: chat_id,
            messageId: id
        });
    } else {
        saveOrDownload(file, document.file_name, message);
    }
}

function openGame(game, message, fileCancel) {
    if (!game) return;
    if (!message) return;

    const { chat_id, id } = message;

    const { animation } = game;
    if (animation) {
        let { animation: file } = animation;
        if (!file) return;

        file = FileStore.get(file.id) || file;
        if (fileCancel && file.local.is_downloading_active) {
            FileStore.cancelGetRemoteFile(file.id, message);
            return;
        } else if (fileCancel && file.remote.is_uploading_active) {
            FileStore.cancelUploadFile(file.id, message);
            return;
        }

        download(file, message, () => FileStore.updateAnimationBlob(chat_id, id, file.id));
    }

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    TdLibController.clientUpdate({
        '@type': 'clientUpdateActiveAnimation',
        chatId: chat_id,
        messageId: id
    });
}

function openPhoto(photo, message, fileCancel) {
    if (!photo) return;
    if (!message) return;

    const { chat_id, id } = message;

    const photoSize = getPhotoSize(photo.sizes);
    if (!photoSize) return;

    let { photo: file } = photoSize;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    download(file, message, () => FileStore.updatePhotoBlob(chat_id, id, file.id));

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    ApplicationStore.setMediaViewerContent({
        chatId: chat_id,
        messageId: id
    });
}

async function openSticker(sticker, message, fileCancel) {
    if (!sticker) return;
    if (!message) return;

    const { chat_id, id } = message;

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    const { set_id } = sticker;
    if (!set_id) return;

    const stickerSet = await TdLibController.send({
        '@type': 'getStickerSet',
        set_id
    });

    if (!stickerSet) return;

    TdLibController.clientUpdate({
        '@type': 'clientUpdateStickerSet',
        stickerSet
    });
}

function openVideo(video, message, fileCancel) {
    if (!video) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { video: file } = video;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    ApplicationStore.setMediaViewerContent({
        chatId: chat_id,
        messageId: id
    });
}

function openVideoNote(videoNote, message, fileCancel) {
    if (!videoNote) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { video: file } = videoNote;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    }

    download(file, message, () => FileStore.updateVideoNoteBlob(chat_id, id, file.id));

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    TdLibController.clientUpdate({
        '@type': 'clientUpdateMediaActive',
        chatId: chat_id,
        messageId: id
    });
}

function openVoiceNote(voiceNote, message, fileCancel) {
    if (!voiceNote) return;
    if (!message) return;

    const { chat_id, id } = message;

    let { voice: file } = voiceNote;
    if (!file) return;

    file = FileStore.get(file.id) || file;
    if (fileCancel && file.local.is_downloading_active) {
        FileStore.cancelGetRemoteFile(file.id, message);
        return;
    } else if (fileCancel && file.remote.is_uploading_active) {
        FileStore.cancelUploadFile(file.id, message);
        return;
    } else {
        download(file, message, () => FileStore.updateVoiceNoteBlob(chat_id, id, file.id));
    }

    TdLibController.send({
        '@type': 'openMessageContent',
        chat_id: chat_id,
        message_id: id
    });

    TdLibController.clientUpdate({
        '@type': 'clientUpdateMediaActive',
        chatId: chat_id,
        messageId: id
    });
}

function openMedia(chatId, messageId, fileCancel = true) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return;

    const { content } = message;
    if (!content) return null;

    switch (content['@type']) {
        case 'messageAnimation': {
            const { animation } = content;
            if (animation) {
                openAnimation(animation, message, fileCancel);
            }

            break;
        }
        case 'messageAudio': {
            const { audio } = content;
            if (audio) {
                openAudio(audio, message, fileCancel);
            }

            break;
        }
        case 'messageChatChangePhoto': {
            const { photo } = content;
            if (photo) {
                openChatPhoto(photo, message, fileCancel);
            }

            break;
        }
        case 'messageContact': {
            const { contact } = content;
            if (contact) {
                openContact(contact, message, fileCancel);
            }

            break;
        }
        case 'messageDocument': {
            const { document } = content;
            if (document) {
                openDocument(document, message, fileCancel);
            }

            break;
        }
        case 'messageGame': {
            const { game } = content;
            if (game) {
                openGame(game, message, fileCancel);
            }

            break;
        }
        case 'messagePhoto': {
            const { photo } = content;
            if (photo) {
                openPhoto(photo, message, fileCancel);
            }

            break;
        }
        case 'messageSticker': {
            const { sticker } = content;
            if (sticker) {
                openSticker(sticker, message, fileCancel);
            }

            break;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { animation, audio, document, photo, sticker, video, video_note, voice_note } = web_page;

                if (animation) {
                    openAnimation(animation, message, fileCancel);
                }

                if (audio) {
                    openAudio(audio, message, fileCancel);
                }

                if (document) {
                    openDocument(document, message, fileCancel);
                }

                if (sticker) {
                    openSticker(sticker, message, fileCancel);
                }

                if (video) {
                    openVideo(video, message, fileCancel);
                }

                if (video_note) {
                    openVideoNote(video_note, message, fileCancel);
                }

                if (voice_note) {
                    openVoiceNote(voice_note, message, fileCancel);
                }

                if (photo) {
                    openPhoto(photo, message, fileCancel);
                }
            }

            break;
        }
        case 'messageVideo': {
            const { video } = content;
            if (video) {
                openVideo(video, message, fileCancel);
            }

            break;
        }
        case 'messageVideoNote': {
            const { video_note } = content;
            if (video_note) {
                openVideoNote(video_note, message, fileCancel);
            }

            break;
        }
        case 'messageVoiceNote': {
            const { voice_note } = content;
            if (voice_note) {
                openVoiceNote(voice_note, message, fileCancel);
            }

            break;
        }
    }
}

function isDeletedMessage(message) {
    return message && message['@type'] === 'deletedMessage';
}

function getReplyPhotoSize(chatId, messageId) {
    const message = MessageStore.get(chatId, messageId);
    if (!message) return;

    const { content } = message;
    if (!content) return null;

    switch (content['@type']) {
        case 'messageAnimation': {
            const { animation } = content;
            if (!animation) return null;

            const { thumbnail } = animation;
            return thumbnail || null;
        }
        case 'messageAudio': {
            const { audio } = content;
            if (!audio) return null;

            const { album_cover_thumbnail } = audio;
            return album_cover_thumbnail || null;
        }
        case 'messageChatChangePhoto': {
            const { photo } = content;
            if (!photo) return null;

            return getPhotoSize(photo.sizes);
        }
        case 'messageDocument': {
            const { document } = content;
            if (!document) return null;

            const { thumbnail } = document;
            return thumbnail || null;
        }
        case 'messageGame': {
            const { game } = content;
            if (!game) return null;

            const { animation, photo } = game;
            if (animation) {
                const { thumbnail } = animation;
                if (thumbnail) {
                    return thumbnail;
                }
            }

            if (photo) {
                return getPhotoSize(photo.sizes);
            }

            return null;
        }
        case 'messagePhoto': {
            const { photo } = content;
            if (!photo) return null;

            return getPhotoSize(photo.sizes);
        }
        case 'messageSticker': {
            const { sticker } = content;
            if (!sticker) return null;

            const { thumbnail } = sticker;
            return thumbnail || null;
        }
        case 'messageText': {
            const { web_page } = content;
            if (web_page) {
                const { animation, audio, document, photo, sticker, video, video_note } = web_page;
                if (photo) {
                    return getPhotoSize(photo.sizes);
                }
                if (animation) {
                    const { thumbnail } = animation;
                    return thumbnail || null;
                }
                if (audio) {
                    const { album_cover_thumbnail } = audio;
                    return album_cover_thumbnail || null;
                }
                if (document) {
                    const { thumbnail } = document;
                    return thumbnail || null;
                }
                if (sticker) {
                    const { thumbnail } = sticker;
                    return thumbnail || null;
                }
                if (video) {
                    const { thumbnail } = video;
                    return thumbnail || null;
                }
                if (video_note) {
                    const { thumbnail } = video_note;
                    return thumbnail || null;
                }
            }

            break;
        }
        case 'messageVideo': {
            const { video } = content;
            if (!video) return null;

            const { thumbnail } = video;
            return thumbnail || null;
        }
        case 'messageVideoNote': {
            const { video_note } = content;
            if (!video_note) return null;

            const { thumbnail } = video_note;
            return thumbnail || null;
        }
    }

    return null;
}

function parseHtmlAttrs(attrs) {
    let map = { style: {} };
    let match;
    const attrRegex = new RegExp(
        '[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*([\'"])((?:\\\\\\2|(?!\\2).)*)\\2',
        'ig'
    );
    while ((match = attrRegex.exec(attrs))) {
        if (match[1].toLowerCase() === 'style') {
            for (let prop of match[3].toLowerCase().split(';')) {
                let pv = prop.split(':');
                if (pv.length === 2) {
                    map.style[pv[0].trim()] = pv[1].trim();
                }
            }
        } else {
            map[match[1].toLowerCase()] = match[3];
        }
    }
    return map;
}

function cleanupHtml(html) {
    let cleanHtml;
    html = html
        .replace(/<meta((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)+\s*|\s*)\/?>/gi, '')
        .replace(/<![^>]*>/gi, '')
        .replace(/\n/gi, '');
    for (let tag of ['style', 'head', 'script', 'svg']) {
        html = html.replace(
            new RegExp(
                `<${tag}((?:\\s+[\\w-]+(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^'">\\s]+))?)+\\s*|\\s*)>.*?</${tag}>`,
                'igs'
            ),
            ''
        );
    }

    while (true) {
        cleanHtml = html.replace(
            /<([\w-]+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)+\s*|\s*)>([^<]*)<\/[\w-]+>/g,
            (outer, tag, attrs, inner) => {
                let { style, href } = parseHtmlAttrs(attrs);
                tag = tag.toLowerCase();
                let isBlock,
                    bullet = '';
                if (style['display']) {
                    isBlock = ['grid', 'flex', 'block'].includes(style['display']);
                } else {
                    isBlock = 'address article aside blockquote dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav noscript ol p pre section table tfoot ul video'
                        .split(' ')
                        .includes(tag);
                }

                if (style['display']) {
                    bullet = style['display'] === 'list-item' ? '• ' : '';
                } else {
                    bullet = tag === 'li' ? '• ' : '';
                }

                if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
                    return `\x00strong\x01${inner}\x00/strong\x01\x00br/\x01\x00br/\x01`;
                }
                if (
                    ['b', 'strong'].includes(tag) ||
                    style['font-weight'] >= 500 ||
                    ['bold', 'bolder'].includes(style['font-weight'])
                ) {
                    return `${bullet}\x00strong\x01${inner}\x00/strong\x01${isBlock ? '\x00br/\x01' : ''}`;
                }
                if (['i', 'em', 'var', 'cite', 'blockquote'].includes(tag) || style['font-style'] == 'italic') {
                    return `${bullet}\x00em\x01${inner}\x00/em\x01${isBlock ? '\x00br/\x01' : ''}`;
                }
                if (
                    ['code', 'kbd', 'samp', 'xmp', 'tt'].includes(tag) ||
                    (!isBlock && style['font-family'] && style['font-family'].indexOf('monospace') > -1)
                ) {
                    return `${bullet}\x00code\x01${inner}\x00/code\x01${isBlock ? '\x00br/\x01' : ''}`;
                }
                if (
                    ['pre'].includes(tag) ||
                    (isBlock && style['font-family'] && style['font-family'].indexOf('monospace') > -1)
                ) {
                    return `${bullet}\x00pre\x01${inner}\x00/pre\x01\x00br/\x01`;
                }
                if (tag === 'a' && href) {
                    return `${bullet}\x00a href="${href}"\x01${inner}\x00/a\x01${isBlock ? '\x00br/\x01' : ''}`;
                }
                return `${bullet}${inner}${isBlock ? '\x00br/\x01' : ''}${tag === 'p' ? '\x00br/\x01' : ''}`;
            }
        );
        if (cleanHtml === html) {
            break;
        }
        html = cleanHtml;
    }
    html = cleanHtml;
    while (true) {
        cleanHtml = html.replace(
            /<\/?([\w-]+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)+\s*|\s*)\/?>/g,
            (outer, tag) => {
                tag = tag.toLowerCase();
                if (['br'].includes(tag)) {
                    return '<br/>';
                }
                return '';
            }
        );
        if (cleanHtml === html) {
            break;
        }
        html = cleanHtml;
    }
    html = cleanHtml.replace(/\x00/g, '<').replace(/\x01/g, '>');
    html = html
        .replace(/(<br\/>\s*){3,}/gis, '<br/><br/>')
        .replace(/(<br\/>\s*)*$/gis, '')
        .replace(/^(<br\/>\s*)*/gis, '')
        .trim();
    return html;
}

function htmlToFormattedText(html) {
    const entitiesMap = {
        a: 'textEntityTypeTextUrl',
        b: 'textEntityTypeBold',
        strong: 'textEntityTypeBold',
        i: 'textEntityTypeItalic',
        em: 'textEntityTypeItalic',
        code: 'textEntityTypeCode',
        pre: 'textEntityTypePre'
    };

    const ta = document.createElement('textarea');

    const tagRegex = /<(\/?)(\w+)((?:\s+\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)+\s*|\s*)(\/?)>/g;
    let match,
        text = '',
        entities = [];
    let index = 0,
        depth = 0;
    while ((match = tagRegex.exec(html))) {
        let tag = match[2].toLowerCase();
        ta.innerHTML = html.substring(index, tagRegex.lastIndex - match[0].length);
        text += ta.value;
        index = tagRegex.lastIndex;
        if (tag === 'br') {
            text += '\n';
            continue;
        }
        if (match[1] === '/') {
            if (tag === 'p' || tag === 'div') {
                text += '\n' + (tag === 'p' ? '\n' : '');
            }
            depth--;
            if (depth === 0) {
                entities[entities.length - 1].length = text.length - entities[entities.length - 1].offset;
            }
            continue;
        }
        if (match[4] === '/') {
            continue;
        }

        depth++;
        if (depth === 1 && ['a', 'b', 'strong', 'i', 'em', 'pre', 'code'].includes(tag)) {
            entities.push({
                '@type': 'textEntity',
                offset: text.length,
                length: 0,
                type: {
                    '@type': entitiesMap[tag]
                }
            });

            if (tag === 'a') {
                let { href } = parseHtmlAttrs(match[3]);
                entities[entities.length - 1].type.url = href;
            }
        }
    }

    if (index < html.length - 1) {
        ta.innerHTML = html.substring(index);
        text += ta.value;
    }

    if (depth > 0) {
        entities[entities.length - 1].length = text.length - entities[entities.length - 1].offset;
    }

    //console.log(text, entities);

    return {
        '@type': 'formattedText',
        text: text,
        entities: entities.length ? entities : null
    };
}

function getEmojiCount(text) {
    const emojiRegExp =
        '(?:[\\u2700-\\u27bf]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\u0023-\\u0039]\\ufe0f?\\u20e3|\\u3299|\\u3297|\\u303d|\\u3030|\\u24c2|\\ud83c[\\udd70-\\udd71]|\\ud83c[\\udd7e-\\udd7f]|\\ud83c\\udd8e|\\ud83c[\\udd91-\\udd9a]|\\ud83c[\\udde6-\\uddff]|[\\ud83c[\\ude01\\uddff]|\\ud83c[\\ude01-\\ude02]|\\ud83c\\ude1a|\\ud83c\\ude2f|[\\ud83c[\\ude32\\ude02]|\\ud83c\\ude1a|\\ud83c\\ude2f|\\ud83c[\\ude32-\\ude3a]|[\\ud83c[\\ude50\\ude3a]|\\ud83c[\\ude50-\\ude51]|\\u203c|\\u2049|[\\u25aa-\\u25ab]|\\u25b6|\\u25c0|[\\u25fb-\\u25fe]|\\u00a9|\\u00ae|\\u2122|\\u2139|\\ud83c\\udc04|[\\u2600-\\u26FF]|\\u2b05|\\u2b06|\\u2b07|\\u2b1b|\\u2b1c|\\u2b50|\\u2b55|\\u231a|\\u231b|\\u2328|\\u23cf|[\\u23e9-\\u23f3]|[\\u23f8-\\u23fa]|\\ud83c\\udccf|\\u2934|\\u2935|[\\u2190-\\u21ff])';
    if (text.length > 12 || !text.length) {
        return null;
    }
    for (let i = 1; i <= 3; i++) {
        if (text.match(new RegExp(`^${emojiRegExp}{${i}}$`))) {
            return i;
        }
    }
    return null;
}

export {
    getAuthor,
    getTitle,
    getText,
    getFormattedText,
    getWebPage,
    getContent,
    getDate,
    getDateHint,
    getMedia,
    isForwardOriginHidden,
    getForwardTitle,
    getUnread,
    getSenderUserId,
    filterMessages,
    isMediaContent,
    isDeletedMessage,
    isVideoMessage,
    isAnimationMessage,
    isLottieMessage,
    getLocationId,
    isContentOpened,
    getMediaTitle,
    hasAudio,
    hasVideoNote,
    getSearchMessagesFilter,
    openMedia,
    getReplyPhotoSize,
    cleanupHtml,
    htmlToFormattedText,
    getMessageCallType,
    isMessageCallCancelled,
    getEmojiCount
};
