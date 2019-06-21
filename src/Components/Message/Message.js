/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import { compose } from 'recompose';
import { withTranslation } from 'react-i18next';
import withStyles from '@material-ui/core/styles/withStyles';
import Reply from './Reply';
import Forward from './Forward';
import MessageStatus from './MessageStatus';
import MessageAuthor from './MessageAuthor';
import UserTileControl from '../Tile/UserTileControl';
import ChatTileControl from '../Tile/ChatTileControl';
import UnreadSeparator from './UnreadSeparator';
import WebPage from './Media/WebPage';
import {
    getDate,
    getDateHint,
    getText,
    getMedia,
    getUnread,
    getSenderUserId,
    getWebPage,
    openMedia
} from '../../Utils/Message';
import { canSendMessages, isPrivateChat, getChatShortTitle } from '../../Utils/Chat';
import { openUser, openChat, selectMessage } from '../../Actions/Client';
import MessageStore from '../../Stores/MessageStore';
import ApplicationStore from '../../Stores/ApplicationStore';
import TdLibController from '../../Controllers/TdLibController';
import Popover from '@material-ui/core/Popover';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import './Message.css';

const styles = theme => ({
    message: {
        backgroundColor: 'transparent'
    },
    messageAuthorColor: {
        color: theme.palette.primary.main
    },
    messageSelected: {
        backgroundColor: theme.palette.primary.main + '22'
    },
    '@keyframes highlighted': {
        from: { backgroundColor: theme.palette.primary.main + '22' },
        to: { backgroundColor: 'transparent' }
    },
    messageHighlighted: {
        animation: 'highlighted 4s ease-out'
    }
});

class Message extends Component {
    constructor(props) {
        super(props);

        if (process.env.NODE_ENV !== 'production') {
            const { chatId, messageId } = this.props;
            this.state = {
                message: MessageStore.get(chatId, messageId),
                selected: false,
                highlighted: false
            };
        } else {
            this.state = {
                selected: false,
                highlighted: false
            };
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const { theme, chatId, messageId, sendingState, showUnreadSeparator } = this.props;
        const { contextMenu, selected, highlighted, openDeleteDialog } = this.state;

        if (nextProps.theme !== theme) {
            return true;
        }

        if (nextProps.chatId !== chatId) {
            return true;
        }

        if (nextProps.messageId !== messageId) {
            return true;
        }

        if (nextProps.sendingState !== sendingState) {
            return true;
        }

        if (nextProps.showUnreadSeparator !== showUnreadSeparator) {
            return true;
        }

        if (nextState.contextMenu !== contextMenu) {
            return true;
        }

        if (nextState.openDeleteDialog !== openDeleteDialog) {
            return true;
        }

        if (nextState.selected !== selected) {
            return true;
        }

        if (nextState.highlighted !== highlighted) {
            return true;
        }

        return false;
    }

    componentDidMount() {
        MessageStore.on('clientUpdateMessageHighlighted', this.onClientUpdateMessageHighlighted);
        MessageStore.on('clientUpdateMessageSelected', this.onClientUpdateMessageSelected);
        MessageStore.on('clientUpdateClearSelection', this.onClientUpdateClearSelection);
        MessageStore.on('updateMessageContent', this.onUpdateMessageContent);
        MessageStore.on('updateMessageEdited', this.onUpdateMessageEdited);
        MessageStore.on('updateMessageViews', this.onUpdateMessageViews);
    }

    componentWillUnmount() {
        MessageStore.removeListener('clientUpdateMessageHighlighted', this.onClientUpdateMessageHighlighted);
        MessageStore.removeListener('clientUpdateMessageSelected', this.onClientUpdateMessageSelected);
        MessageStore.removeListener('clientUpdateClearSelection', this.onClientUpdateClearSelection);
        MessageStore.removeListener('updateMessageContent', this.onUpdateMessageContent);
        MessageStore.removeListener('updateMessageEdited', this.onUpdateMessageEdited);
        MessageStore.removeListener('updateMessageViews', this.onUpdateMessageViews);
    }

    onClientUpdateClearSelection = update => {
        if (!this.state.selected) return;

        this.setState({ selected: false });
    };

    onClientUpdateMessageHighlighted = update => {
        const { chatId, messageId } = this.props;
        const { selected, highlighted } = this.state;

        if (selected) return;

        if (chatId === update.chatId && messageId === update.messageId) {
            if (highlighted) {
                this.setState({ highlighted: false }, () => {
                    setTimeout(() => {
                        this.setState({ highlighted: true });
                    }, 0);
                });
            } else {
                this.setState({ highlighted: true });
            }
        } else if (highlighted) {
            this.setState({ highlighted: false });
        }
    };

    onClientUpdateMessageSelected = update => {
        const { chatId, messageId } = this.props;
        const { selected } = update;

        if (chatId === update.chatId && messageId === update.messageId) {
            this.setState({ selected, highlighted: false });
        }
    };

    onUpdateMessageEdited = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;

        if (chatId === chat_id && messageId === message_id) {
            this.forceUpdate();
        }
    };

    onUpdateMessageViews = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;

        if (chatId === chat_id && messageId === message_id) {
            this.forceUpdate();
        }
    };

    onUpdateMessageContent = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;

        if (chatId !== chat_id) return;
        if (messageId !== message_id) return;

        const message = MessageStore.get(chatId, messageId);
        if (!message) return;

        const { content } = message;
        if (!content) return;

        switch (content['@type']) {
            case 'messagePoll': {
                this.forceUpdate();
                break;
            }
        }
    };

    handleSelectUser = userId => {
        openUser(userId, true);
    };

    handleSelectChat = chatId => {
        openChat(chatId, true);
    };

    handleSelection = () => {
        if (!this.mouseDown) return;

        const selection = window.getSelection().toString();
        if (selection) return;

        const { chatId, messageId } = this.props;

        const selected = !MessageStore.selectedItems.has(`chatId=${chatId}_messageId=${messageId}`);
        selectMessage(chatId, messageId, selected);
    };

    handleDateClick = e => {
        e.preventDefault();
        e.stopPropagation();

        const { chatId, messageId } = this.props;

        const message = MessageStore.get(chatId, messageId);

        const canBeReplied = canSendMessages(chatId);
        if (canBeReplied) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateReply',
                chatId: chatId,
                messageId: messageId
            });
            return;
        }

        const canBeForwarded = message && message.can_be_forwarded;
        if (canBeForwarded) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateForward',
                info: {
                    chatId: chatId,
                    messageIds: [messageId]
                }
            });
        }
    };

    openMedia = event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const { chatId, messageId } = this.props;

        openMedia(chatId, messageId);
    };

    handleAnimationEnd = () => {
        this.setState({ highlighted: false });
    };

    handleMouseDown = () => {
        this.mouseDown = true;
    };

    handleMouseOver = () => {
        this.mouseDown = false;
    };

    handleMouseOut = () => {
        this.mouseOut = false;
    };

    handleContextMenu = event => {
        if ((window.getSelection() + '').length > 0) {
            // Allow user to use the default context menu when he selected some text
            return;
        }

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

    handleReply = event => {
        const { chatId, messageId } = this.props;
        TdLibController.clientUpdate({ '@type': 'clientUpdateReply', chatId: chatId, messageId: messageId });
        this.setState({ contextMenu: false });
    };

    handleForward = event => {
        const { chatId, messageId } = this.props;
        TdLibController.clientUpdate({
            '@type': 'clientUpdateForward',
            info: {
                chatId: chatId,
                messageIds: [messageId]
            }
        });
        this.setState({ contextMenu: false });
    };

    handleDelete = () => {
        const { chatId, messageId } = this.props;
        let canBeDeletedForAllUsers = true;
        const message = MessageStore.get(chatId, messageId);
        if (!message || !message.can_be_deleted_for_all_users) {
            canBeDeletedForAllUsers = false;
        }

        this.setState({
            contextMenu: false,
            openDeleteDialog: true,
            canBeDeletedForAllUsers: canBeDeletedForAllUsers,
            revoke: canBeDeletedForAllUsers
        });
    };

    handleDeleteContinue = event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const { chatId, messageId } = this.props;

        TdLibController.send({
            '@type': 'deleteMessages',
            chat_id: chatId,
            message_ids: [messageId],
            revoke: this.state.revoke
        });
        this.setState({ openDeleteDialog: false });
    };

    handleRevokeChange = () => {
        this.setState({ revoke: !this.state.revoke });
    };

    handleCloseDelete = event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.setState({ openDeleteDialog: false });
    };

    handleLinkClick = event => {
        const { chatId, messageId } = this.props;

        if (event) {
            event.stopPropagation();
        }

        const href = event.target.href;
        let match;

        if ((match = href.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me|telegram\.dog)\/joinchat\/(.+)$/i))) {
            // private link
            TdLibController.send({
                '@type': 'checkChatInviteLink',
                invite_link: match[0]
            }).then(result => {
                if (result.chat_id) {
                    openChat(result.chat_id, null);
                } else {
                    console.log(result); // TODO: show confirmation dialog here
                    TdLibController.send({
                        '@type': 'joinChatByInviteLink',
                        invite_link: match[0]
                    }).then(result => {
                        openChat(result.id, null);
                    });
                }
            });
        } else if (
            (match = href.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me|telegram\.dog)\/(.+)$/i)) ||
            (match = href.match(/^tg:\/\/resolve\?domain=(.+)$/i))
        ) {
            // public link
            // mention by username
            TdLibController.send({
                '@type': 'searchPublicChat',
                username: match[1]
            }).then(result => {
                if (result.id) {
                    openUser(result.id, true);
                } else {
                    // TODO: handle not found
                }
            });
        } else if ((match = href.match(/^tg:\/\/user\?id=(.+)$/i))) {
            // mention by user id
            openUser(match[1], true);
        } else if ((match = href.match(/^tg:\/\/search_hashtag\?hashtag=(.+)$/i))) {
            // hashtag
            ApplicationStore.emit('clientUpdateSearchChat', { chatId, text: `#${match[1]}` });
            ApplicationStore.emit('clientUpdateSearchHashtag', { text: `#${match[1]}` });
        } else if ((match = href.match(/^tg:\/\/bot_command\?command=(.+)$/i))) {
            // bot command
            TdLibController.send({
                '@type': 'sendMessage',
                chat_id: chatId,
                input_message_content: {
                    '@type': 'inputMessageText',
                    text: {
                        '@type': 'formattedText',
                        text: `/${match[1]}`,
                        entities: null
                    },
                    disable_web_page_preview: true,
                    clear_draft: false
                }
            }).then(result => {
                TdLibController.send({
                    '@type': 'viewMessages',
                    chat_id: chatId,
                    message_ids: [result.id]
                });
            });
        } else {
            // unrecognized: pass to browser and hope for the best
            return;
        }

        if (event) {
            event.preventDefault();
        }
    };

    render() {
        const { t, classes, chatId, messageId, showUnreadSeparator } = this.props;
        const {
            contextMenu,
            left,
            top,
            selected,
            highlighted,
            openDeleteDialog,
            canBeDeletedForAllUsers,
            revoke
        } = this.state;

        const message = MessageStore.get(chatId, messageId);
        if (!message) return <div>[empty message]</div>;

        const { sending_state, views, edit_date, reply_to_message_id, forward_info } = message;

        const text = getText(message, this.handleLinkClick);
        const webPage = getWebPage(message);
        const date = getDate(message);
        const dateHint = getDateHint(message);
        const media = getMedia(message, this.openMedia);
        this.unread = getUnread(message);
        const senderUserId = getSenderUserId(message);

        let canBeDeleted = true;
        let canBeForwarded = true;
        let canBeReplied = true;
        if (contextMenu) {
            const message = MessageStore.get(chatId, messageId);
            if (!message) {
                canBeDeleted = false;
                canBeForwarded = false;
            } else {
                if (!message.can_be_deleted_only_for_self && !message.can_be_deleted_for_all_users) {
                    canBeDeleted = false;
                }
                if (!message.can_be_forwarded) {
                    canBeForwarded = false;
                }
            }
            canBeReplied = canSendMessages(chatId);
        }

        const tile = senderUserId ? (
            <UserTileControl userId={senderUserId} onSelect={this.handleSelectUser} />
        ) : (
            <ChatTileControl chatId={chatId} onSelect={this.handleSelectChat} />
        );

        const messageClassName = classNames(
            'message',
            classes.message,
            { 'message-selected': selected },
            { [classes.messageSelected]: selected },
            // { 'message-highlighted': highlighted && !selected },
            { [classes.messageHighlighted]: highlighted && !selected }
        );

        return (
            <div
                className={messageClassName}
                onMouseOver={this.handleMouseOver}
                onMouseOut={this.handleMouseOut}
                onMouseDown={this.handleMouseDown}
                onClick={this.handleSelection}
                onContextMenu={this.handleContextMenu}
                onAnimationEnd={this.handleAnimationEnd}>
                {showUnreadSeparator && <UnreadSeparator />}
                <div className='message-wrapper'>
                    <i className='message-select-tick' />
                    {this.unread && (
                        <MessageStatus chatId={chatId} messageId={messageId} sendingState={sending_state} />
                    )}
                    {tile}
                    <div className='message-content'>
                        <div className='message-title'>
                            {!forward_info && <MessageAuthor chatId={chatId} openChat userId={senderUserId} openUser />}
                            {forward_info && <Forward forwardInfo={forward_info} />}
                            <div className='message-meta'>
                                <span>&nbsp;</span>
                                {views > 0 && (
                                    <>
                                        <i className='message-views-icon' />
                                        <span className='message-views'>
                                            &nbsp;
                                            {views}
                                            &nbsp; &nbsp;
                                        </span>
                                    </>
                                )}
                                {edit_date > 0 && <span>{t('EditedMessage')}&nbsp;</span>}
                                <a className='message-date' onClick={this.handleDateClick}>
                                    <span title={dateHint}>{date}</span>
                                </a>
                            </div>
                        </div>
                        {Boolean(reply_to_message_id) && <Reply chatId={chatId} messageId={reply_to_message_id} />}
                        {media}
                        <div className='message-text'>{text}</div>
                        {webPage && <WebPage chatId={chatId} messageId={messageId} openMedia={this.openMedia} />}
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
                        {canBeReplied && <MenuItem onClick={this.handleReply}>{t('Reply')}</MenuItem>}
                        {canBeForwarded && <MenuItem onClick={this.handleForward}>{t('Forward')}</MenuItem>}
                        {canBeDeleted && <MenuItem onClick={this.handleDelete}>{t('Delete')}</MenuItem>}
                    </MenuList>
                </Popover>
                <Dialog
                    transitionDuration={0}
                    open={openDeleteDialog}
                    onClose={this.handleCloseDelete}
                    aria-labelledby='delete-dialog-title'>
                    <DialogTitle id='delete-dialog-title'>Confirm</DialogTitle>
                    <DialogContent>
                        <DialogContentText>Are you sure you want to delete 1 message?</DialogContentText>
                        {canBeDeletedForAllUsers && (
                            <FormControlLabel
                                control={
                                    <Checkbox checked={revoke} onChange={this.handleRevokeChange} color='primary' />
                                }
                                label={
                                    isPrivateChat(chatId) ? `Delete for ${getChatShortTitle(chatId)}` : 'Delete for all'
                                }
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCloseDelete} color='primary'>
                            Cancel
                        </Button>
                        <Button onClick={this.handleDeleteContinue} color='primary'>
                            Ok
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}

const enhance = compose(
    withStyles(styles, { withTheme: true }),
    withTranslation()
);

export default enhance(Message);
