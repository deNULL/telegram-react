/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import withStyles from '@material-ui/core/styles/withStyles';
import { withTranslation } from 'react-i18next';
import { withSnackbar } from 'notistack';
import { compose } from 'recompose';
import ChatTileControl from '../Tile/ChatTileControl';
import NotificationTimer from '../Additional/NotificationTimer';
import { canClearHistory, canDeleteChat, getChatShortTitle, isPrivateChat, isChatMuted } from '../../Utils/Chat';
import { MUTED_VALUE_MAX, MUTED_VALUE_MIN, NOTIFICATION_AUTO_HIDE_DURATION_MS } from '../../Constants';
import ApplicationStore from '../../Stores/ApplicationStore';
import ChatStore from '../../Stores/ChatStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import TdLibController from '../../Controllers/TdLibController';
import './MainMenuButton.css';

import LeaveChatDialog from '../Dialog/LeaveChatDialog';
import ClearHistoryDialog from '../Dialog/ClearHistoryDialog';

const styles = theme => ({
    menuIconButton: {
        margin: '8px 12px 8px 0'
    }
});

const menuAnchorOrigin = {
    vertical: 'bottom',
    horizontal: 'right'
};

const menuTransformOrigin = {
    vertical: 'top',
    horizontal: 'right'
};

class MainMenuButton extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            anchorEl: null,
            openDelete: false,
            openClearHistory: false
        };
    }

    handleButtonClick = event => {
        this.setState({ anchorEl: event.currentTarget });
    };

    handleMenuClose = () => {
        this.setState({ anchorEl: null });
    };

    handleChatInfo = () => {
        this.handleMenuClose();
        setTimeout(() => this.props.openChatDetails(), 150);
    };

    handleMute = mute => {
        const chatId = ApplicationStore.getChatId();
        const chat = ChatStore.get(chatId);

        this.handleMenuClose();

        if (!chat) return;
        if (!chat.notification_settings) return;

        const isMutedPrev = isChatMuted(chat);
        if (isMutedPrev === mute) {
            return;
        }

        const muteFor = mute ? MUTED_VALUE_MAX : MUTED_VALUE_MIN;
        const newNotificationSettings = {
            ...chat.notification_settings,
            use_default_mute_for: false,
            mute_for: muteFor
        };

        TdLibController.send({
            '@type': 'setChatNotificationSettings',
            chat_id: chatId,
            notification_settings: newNotificationSettings
        });
    };

    handleClearHistory = () => {
        this.handleMenuClose();

        this.setState({ openClearHistory: true });
    };

    handleClearHistoryContinue = result => {
        const { t } = this.props;
        this.setState({ openClearHistory: false });

        if (!result) return;

        const chatId = ApplicationStore.getChatId();
        const message = t('HistoryClearedUndo');
        const request = {
            '@type': 'deleteChatHistory',
            chat_id: chatId,
            remove_from_chat_list: false
        };

        this.handleScheduledAction(chatId, 'clientUpdateClearHistory', message, request);
    };

    handleLeave = () => {
        this.handleMenuClose();

        this.setState({ openDelete: true });
    };

    handleLeaveContinue = result => {
        this.setState({ openDelete: false });

        if (!result) return;

        const chatId = ApplicationStore.getChatId();
        const message = this.getLeaveChatNotification(chatId);
        const request = isPrivateChat(chatId)
            ? { '@type': 'deleteChatHistory', chat_id: chatId, remove_from_chat_list: true }
            : { '@type': 'leaveChat', chat_id: chatId };

        this.handleScheduledAction(chatId, 'clientUpdateLeaveChat', message, request);
    };

    handleScheduledAction = (chatId, clientUpdateType, message, request) => {
        const { t } = this.props;
        if (!clientUpdateType) return;

        const key = `${clientUpdateType} chatId=${chatId}`;
        const action = async () => {
            try {
                await TdLibController.send(request);
            } finally {
                TdLibController.clientUpdate({ '@type': clientUpdateType, chatId: chatId, inProgress: false });
            }
        };
        const cancel = () => {
            TdLibController.clientUpdate({ '@type': clientUpdateType, chatId: chatId, inProgress: false });
        };

        const { enqueueSnackbar, classes } = this.props;
        if (!enqueueSnackbar) return;

        const TRANSITION_DELAY = 150;
        if (ApplicationStore.addScheduledAction(key, NOTIFICATION_AUTO_HIDE_DURATION_MS, action, cancel)) {
            TdLibController.clientUpdate({ '@type': clientUpdateType, chatId: chatId, inProgress: true });
            enqueueSnackbar(message, {
                autoHideDuration: NOTIFICATION_AUTO_HIDE_DURATION_MS - 2 * TRANSITION_DELAY,
                action: [
                    <IconButton key='progress' color='inherit' className='progress-button'>
                        <NotificationTimer timeout={NOTIFICATION_AUTO_HIDE_DURATION_MS} />
                    </IconButton>,
                    <Button
                        key='undo'
                        color='primary'
                        size='small'
                        onClick={() => ApplicationStore.removeScheduledAction(key)}>
                        {t('Undo')}
                    </Button>
                ]
            });
        }
    };

    getLeaveChatTitle = chatId => {
        const { t } = this.props;
        const chat = ChatStore.get(chatId);
        if (!chat) return null;
        if (!chat.type) return null;

        switch (chat.type['@type']) {
            case 'chatTypeBasicGroup': {
                return t('DeleteChat');
            }
            case 'chatTypeSupergroup': {
                const supergroup = SupergroupStore.get(chat.type.supergroup_id);
                if (supergroup) {
                    return supergroup.is_channel ? t('LeaveChannelMenu') : t('LeaveMegaMenu');
                }

                return null;
            }
            case 'chatTypePrivate':
            case 'chatTypeSecret': {
                return t('DeleteChatUser');
            }
        }

        return null;
    };

    getLeaveChatNotification = chatId => {
        const { t } = this.props;
        const chat = ChatStore.get(chatId);
        if (!chat) return t('ChatDeletedUndo');
        if (!chat.type) return t('ChatDeletedUndo');

        switch (chat.type['@type']) {
            case 'chatTypeBasicGroup': {
                return t('ChatDeletedUndo');
            }
            case 'chatTypeSupergroup': {
                const supergroup = SupergroupStore.get(chat.type.supergroup_id);
                if (supergroup) {
                    return supergroup.is_channel ? t('ChannelDeletedUndo') : t('GroupDeletedUndo');
                }

                return t('ChatDeletedUndo');
            }
            case 'chatTypePrivate':
            case 'chatTypeSecret': {
                return t('ChatDeletedUndo');
            }
        }

        return t('ChatDeletedUndo');
    };

    render() {
        const { classes, t } = this.props;
        const { anchorEl, openDelete, openClearHistory } = this.state;

        const chatId = ApplicationStore.getChatId();
        const chat = ChatStore.get(chatId);
        const clearHistory = canClearHistory(chatId);
        const deleteChat = canDeleteChat(chatId);
        const leaveChatTitle = this.getLeaveChatTitle(chatId);
        const chatMuted = isChatMuted(chat);

        return (
            <>
                <IconButton
                    aria-owns={anchorEl ? 'simple-menu' : null}
                    aria-haspopup='true'
                    className={classes.menuIconButton}
                    aria-label='Menu'
                    onClick={this.handleButtonClick}>
                    <MoreVertIcon />
                </IconButton>
                <Menu
                    id='main-menu'
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={this.handleMenuClose}
                    getContentAnchorEl={null}
                    disableAutoFocusItem
                    disableRestoreFocus={true}
                    anchorOrigin={menuAnchorOrigin}
                    transformOrigin={menuTransformOrigin}>
                    <MenuItem onClick={this.handleChatInfo}>{t('ChatInfo')}</MenuItem>
                    {!chatMuted && <MenuItem onClick={() => this.handleMute(true)}>{t('MuteNotifications')}</MenuItem>}
                    {chatMuted && (
                        <MenuItem onClick={() => this.handleMute(false)}>{t('UnmuteNotifications')}</MenuItem>
                    )}
                    {clearHistory && <MenuItem onClick={this.handleClearHistory}>{t('ClearHistory')}</MenuItem>}
                    {deleteChat && leaveChatTitle && <MenuItem onClick={this.handleLeave}>{leaveChatTitle}</MenuItem>}
                </Menu>
                <LeaveChatDialog chatId={chatId} open={openDelete} onClose={this.handleLeaveContinue} />
                <ClearHistoryDialog chatId={chatId} open={openClearHistory} onClose={this.handleClearHistoryContinue} />
            </>
        );
    }
}

const enhance = compose(
    withStyles(styles),
    withTranslation(),
    withSnackbar
);

export default enhance(MainMenuButton);
