/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@material-ui/core/styles/withStyles';
import ChatTileControl from './ChatTileControl';
import DialogContentControl from './DialogContentControl';
import DialogBadgeControl from './DialogBadgeControl';
import DialogTitleControl from './DialogTitleControl';
import DialogMetaControl from './DialogMetaControl';
import Popover from '@material-ui/core/Popover';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import { openChat } from '../../Actions/Client';
import { canClearHistory, canDeleteChat, isPrivateChat } from '../../Utils/Chat';
import ChatStore from '../../Stores/ChatStore';
import ApplicationStore from '../../Stores/ApplicationStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import TdLibController from '../../Controllers/TdLibController';
import { NOTIFICATION_AUTO_HIDE_DURATION_MS } from '../../Constants';
import NotificationTimer from '../Additional/NotificationTimer';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import './DialogControl.css';

import LeaveChatDialog from '../Dialog/LeaveChatDialog';
import ClearHistoryDialog from '../Dialog/ClearHistoryDialog';

const styles = theme => ({
    statusRoot: {
        position: 'absolute',
        right: 1,
        bottom: 1,
        zIndex: 1
    },
    statusIcon: {},
    dialogActive: {
        color: '#fff', //theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.main,
        borderRadius: 8,
        cursor: 'pointer',
        margin: '0 12px',
        '& $statusRoot': {
            background: theme.palette.primary.main
        }
    },
    dialog: {
        borderRadius: 8,
        cursor: 'pointer',
        margin: '0 12px',
        '&:hover': {
            backgroundColor: theme.palette.primary.main + '22',
            '& $statusRoot': {
                background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF'
            },
            '& $statusIcon': {
                background: theme.palette.primary.main + '22'
            }
        }
    }
});

class DialogControl extends Component {
    constructor(props) {
        super(props);

        this.dialog = React.createRef();

        const chat = ChatStore.get(this.props.chatId);
        this.state = {
            chat: chat
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.chatId !== this.props.chatId) {
            return true;
        }

        if (nextProps.theme !== this.props.theme) {
            return true;
        }

        if (nextProps.hidden !== this.props.hidden) {
            return true;
        }

        if (nextState.contextMenu !== this.state.contextMenu) {
            return true;
        }

        if (nextState.openClearHistory !== this.state.openClearHistory) {
            return true;
        }

        if (nextState.openDelete !== this.state.openDelete) {
            return true;
        }

        return false;
    }

    componentDidMount() {
        ApplicationStore.on('clientUpdateChatId', this.onClientUpdateChatId);
    }

    componentWillUnmount() {
        ApplicationStore.removeListener('clientUpdateChatId', this.onClientUpdateChatId);
    }

    onClientUpdateChatId = update => {
        const { chatId } = this.props;

        if (chatId === update.previousChatId || chatId === update.nextChatId) {
            this.forceUpdate();
        }
    };

    handleSelect = event => {
        if (event.button === 0) {
            // LMB
            openChat(this.props.chatId);
        }
    };

    handleContextMenu = event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const { contextMenu } = this.state;

        if (contextMenu) {
            this.setState({ contextMenu: false });
        } else {
            this.setState({
                contextMenu: true,
                left: event.clientX,
                top: event.clientY
            });
        }
    };

    handleCloseContextMenu = event => {
        if (event) {
            event.stopPropagation();
        }

        this.setState({ contextMenu: false });
    };

    getLeaveChatTitle = chatId => {
        const chat = ChatStore.get(chatId);
        if (!chat) return null;
        if (!chat.type) return null;

        switch (chat.type['@type']) {
            case 'chatTypeBasicGroup': {
                return 'Delete and exit';
            }
            case 'chatTypeSupergroup': {
                const supergroup = SupergroupStore.get(chat.type.supergroup_id);
                if (supergroup) {
                    return supergroup.is_channel ? 'Leave channel' : 'Leave group';
                }

                return null;
            }
            case 'chatTypePrivate':
            case 'chatTypeSecret': {
                return 'Delete conversation';
            }
        }

        return null;
    };

    handleClearHistory = () => {
        this.setState({ openClearHistory: true, contextMenu: false });
    };

    handleClearHistoryContinue = result => {
        this.setState({ openClearHistory: false });

        if (!result) return;

        const chatId = this.props.chatId;
        const message = 'Messages deleted';
        const request = {
            '@type': 'deleteChatHistory',
            chat_id: chatId,
            remove_from_chat_list: false
        };

        this.handleScheduledAction(chatId, 'clientUpdateClearHistory', message, request);
    };

    handleLeave = () => {
        this.setState({ openDelete: true, contextMenu: false });
    };

    handleLeaveContinue = result => {
        this.setState({ openDelete: false });

        if (!result) return;

        const chatId = this.props.chatId;
        const message = this.getLeaveChatNotification(chatId);
        const request = isPrivateChat(chatId)
            ? { '@type': 'deleteChatHistory', chat_id: chatId, remove_from_chat_list: true }
            : { '@type': 'leaveChat', chat_id: chatId };

        this.handleScheduledAction(chatId, 'clientUpdateLeaveChat', message, request);
    };

    handleScheduledAction = (chatId, clientUpdateType, message, request) => {
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
                        UNDO
                    </Button>
                ]
            });
        }
    };

    render() {
        const { classes, chatId, showSavedMessages, hidden } = this.props;
        const { left, top, contextMenu, openDelete, openClearHistory } = this.state;

        if (hidden) return null;

        const currentChatId = ApplicationStore.getChatId();
        const isSelected = currentChatId === chatId;
        const clearHistory = canClearHistory(chatId);
        const deleteChat = canDeleteChat(chatId);
        const leaveChatTitle = this.getLeaveChatTitle(chatId);

        return (
            <div
                ref={this.dialog}
                className={classNames(
                    isSelected ? classes.dialogActive : classes.dialog,
                    isSelected ? 'dialog-active' : 'dialog'
                )}>
                <div className='dialog-wrapper' onMouseDown={this.handleSelect} onContextMenu={this.handleContextMenu}>
                    <ChatTileControl
                        chatId={chatId}
                        showSavedMessages={showSavedMessages}
                        showOnline
                        classes={{ statusRoot: classes.statusRoot, statusIcon: classes.statusIcon }}
                    />
                    <div className='dialog-inner-wrapper'>
                        <div className='tile-first-row'>
                            <DialogTitleControl chatId={chatId} />
                            <DialogMetaControl chatId={chatId} />
                        </div>
                        <div className='tile-second-row'>
                            <DialogContentControl chatId={chatId} />
                            <DialogBadgeControl chatId={chatId} />
                        </div>
                    </div>
                </div>
                <Popover
                    open={contextMenu}
                    onClose={this.handleCloseContextMenu}
                    anchorReference='anchorPosition'
                    anchorPosition={{ top, left }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left'
                    }}>
                    <MenuList onClick={e => e.stopPropagation()}>
                        {clearHistory && <MenuItem onClick={this.handleClearHistory}>Clear history</MenuItem>}
                        {deleteChat && leaveChatTitle && (
                            <MenuItem onClick={this.handleLeave}>{leaveChatTitle}</MenuItem>
                        )}
                    </MenuList>
                </Popover>
                <LeaveChatDialog chatId={chatId} open={openDelete} onClose={this.handleLeaveContinue} />
                <ClearHistoryDialog chatId={chatId} open={openClearHistory} onClose={this.handleClearHistoryContinue} />
            </div>
        );
    }
}

DialogControl.propTypes = {
    chatId: PropTypes.number.isRequired,
    hidden: PropTypes.bool,
    showSavedMessages: PropTypes.bool
};

DialogControl.defaultProps = {
    hidden: false,
    showSavedMessages: true
};

export default withStyles(styles, { withTheme: true })(DialogControl);
