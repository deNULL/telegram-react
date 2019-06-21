import React from 'react';
import { getChatShortTitle } from '../../Utils/Chat';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogTitleControl from '../Tile/DialogTitleControl';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import ChatTileControl from '../Tile/ChatTileControl';
import { withTranslation } from 'react-i18next';

class ClearHistoryDialog extends React.Component {
    render() {
        const { onClose, chatId, t, ...other } = this.props;

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
                            {t('AreYouSureClearHistory')}
                        </DialogContentText>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} color='primary'>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={() => onClose(true)} color='primary' autoFocus>
                        {t('OK')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default withTranslation()(ClearHistoryDialog);
