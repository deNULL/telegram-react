/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ChatStore from '../Stores/ChatStore';
import { t } from 'i18next';

function getBasicGroupStatus(basicGroup, chatId) {
    if (!basicGroup) return null;

    const { status, member_count: count } = basicGroup;

    if (status && (status['@type'] === 'chatMemberStatusBanned' || status['@type'] === 'chatMemberStatusLeft')) {
        return 'group is inaccessible';
    }

    const onlineCount = ChatStore.getOnlineMemberCount(chatId);
    return t('Members', count) + (onlineCount > 1 ? `, ${onlineCount} ${t('Online')}` : '');
}

export { getBasicGroupStatus };
