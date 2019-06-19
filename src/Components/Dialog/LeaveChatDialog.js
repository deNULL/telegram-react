import React from 'react';
import ChatStore from '../../Stores/ChatStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import { getChatShortTitle } from '../../Utils/Chat';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogTitleControl from '../Tile/DialogTitleControl';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import ChatTileControl from '../Tile/ChatTileControl';

class LeaveChatDialog extends React.Component {
    getDeleteDialogText = chatId => {
        const chat = ChatStore.get(chatId);
        if (!chat) return null;
        if (!chat.type) return null;

        switch (chat.type['@type']) {
            case 'chatTypeBasicGroup': {
                return `Are you sure you want to leave group ${chat.title}?`;
            }
            case 'chatTypeSupergroup': {
                const supergroup = SupergroupStore.get(chat.type.supergroup_id);
                if (supergroup) {
                    return supergroup.is_channel
                        ? `Are you sure you want to leave channel ${chat.title}?`
                        : `Are you sure you want to leave group ${chat.title}?`;
                }

                return null;
            }
            case 'chatTypePrivate':
            case 'chatTypeSecret': {
                return `Are you sure you want to delete chat with ${getChatShortTitle(chatId)}?`;
            }
        }

        return null;
    };

    render() {
        const { onClose, chatId, ...other } = this.props;

        return (
            <Dialog
                transitionDuration={0}
                onClose={() => onClose(false)}
                aria-labelledby='delete-dialog-title'
                {...other}>
                <DialogTitle id='delete-dialog-title'>{getChatShortTitle(chatId)}</DialogTitle>
                <DialogContent>
                    <div className='delete-dialog-content'>
                        <ChatTileControl chatId={chatId} />
                        <DialogContentText id='delete-dialog-description'>
                            {this.getDeleteDialogText(chatId)}
                        </DialogContentText>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} color='primary'>
                        Cancel
                    </Button>
                    <Button onClick={() => onClose(true)} color='primary' autoFocus>
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default LeaveChatDialog;
