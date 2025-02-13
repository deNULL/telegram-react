/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import FooterCommand from './FooterCommand';
import NotificationsControl from './NotificationsControl';
import { withTranslation } from 'react-i18next';

class NotificationsCommandControl extends NotificationsControl {
    constructor(props) {
        super(props);
    }

    render() {
        const { t } = this.props;
        const { isMuted } = this.state;
        const command = isMuted ? t('ChannelUnmute') : t('ChannelMute');

        return <FooterCommand command={command} onCommand={this.handleSetChatNotifications} />;
    }
}

export default withTranslation()(NotificationsCommandControl);
