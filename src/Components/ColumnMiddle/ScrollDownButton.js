/*
 *  Copyright (c) 2019, Denis Olshin
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@material-ui/core/styles/withStyles';
import { borderStyle } from '../Theme';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import ChatStore from '../../Stores/ChatStore';
import { getChatUnreadCount } from '../../Utils/Chat';
import './ScrollDownButton.css';

const styles = theme => ({
    background: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        color: theme.palette.primary.contrastText
    },
    badge: {
        background: theme.palette.primary.main
    },
    ...borderStyle(theme)
});

class ScrollDownButton extends React.Component {
    constructor(props) {
        super(props);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return true;
    }

    componentDidMount() {
        ChatStore.on('clientUpdateFastUpdatingComplete', this.onFastUpdatingComplete);
        ChatStore.on('clientUpdateClearHistory', this.onUpdate);
        ChatStore.on('updateChatDraftMessage', this.onUpdate);
        ChatStore.on('updateChatIsMarkedAsUnread', this.onUpdate);
        ChatStore.on('updateChatIsPinned', this.onUpdate);
        ChatStore.on('updateChatNotificationSettings', this.onUpdate);
        ChatStore.on('updateChatReadInbox', this.onUpdate);
        ChatStore.on('updateChatReadOutbox', this.onUpdate);
        ChatStore.on('updateChatUnreadMentionCount', this.onUpdate);
    }

    componentWillUnmount() {
        ChatStore.removeListener('clientUpdateFastUpdatingComplete', this.onFastUpdatingComplete);
        ChatStore.removeListener('clientUpdateClearHistory', this.onUpdate);
        ChatStore.removeListener('updateChatDraftMessage', this.onUpdate);
        ChatStore.removeListener('updateChatIsMarkedAsUnread', this.onUpdate);
        ChatStore.removeListener('updateChatIsPinned', this.onUpdate);
        ChatStore.removeListener('updateChatNotificationSettings', this.onUpdate);
        ChatStore.removeListener('updateChatReadInbox', this.onUpdate);
        ChatStore.removeListener('updateChatReadOutbox', this.onUpdate);
        ChatStore.removeListener('updateChatUnreadMentionCount', this.onUpdate);
    }

    onFastUpdatingComplete = update => {
        this.forceUpdate();
    };

    onUpdate = update => {
        const { chatId } = this.props;

        if (update.chat_id !== chatId) return;

        this.forceUpdate();
    };

    render() {
        const { classes, chatId, onClick } = this.props;

        const chat = ChatStore.get(chatId);
        if (!chat) return null;

        const unreadCount = getChatUnreadCount(chat);

        return (
            <div
                className={classNames(classes.borderColor, classes.background, 'scroll-down-button')}
                onClick={onClick}>
                {(unreadCount && <div className={classNames(classes.badge, 'scroll-down-badge')}>{unreadCount}</div>) ||
                    null}
                <KeyboardArrowDownIcon className='scroll-down-icon' fontSize='large' />
            </div>
        );
    }
}

export default withStyles(styles, { withTheme: true })(ScrollDownButton);
