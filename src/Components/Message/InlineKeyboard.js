/*
 *  Copyright (c) 2019, Denis Olshin
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { compose } from 'recompose';
import { withTranslation } from 'react-i18next';
import withStyles from '@material-ui/core/styles/withStyles';
import { accentStyles } from '../Theme';
import MessageStore from '../../Stores/MessageStore';
import TdLibController from '../../Controllers/TdLibController';
import Button from '@material-ui/core/Button';
import './InlineKeyboard.css';

const styles = theme => ({
    ...accentStyles(theme)
});

class InlineKeyboard extends React.Component {
    componentDidMount() {
        MessageStore.on('clientUpdateMessageEdited', this.onClientUpdateMessageEdited);
    }

    componentWillUnmount() {
        MessageStore.removeListener('clientUpdateMessageEdited', this.onClientUpdateMessageEdited);
    }

    onClientUpdateMessageEdited = () => {
        this.forceUpdate();
    };

    handleClick = async (event, cell) => {
        const { chatId, messageId } = this.props;
        event.preventDefault();
        event.stopPropagation();

        if (cell.type['@type'] === 'inlineKeyboardButtonTypeCallback') {
            const result = await TdLibController.send({
                '@type': 'getCallbackQueryAnswer',
                chat_id: chatId,
                message_id: messageId,
                payload: {
                    '@type': 'callbackQueryPayloadData',
                    data: cell.type.data
                }
            });
        }
    };

    render() {
        const { classes, t, chatId, messageId } = this.props;

        const message = MessageStore.get(chatId, messageId);

        let { reply_markup: markup } = message;

        if (!markup || markup['@type'] !== 'replyMarkupInlineKeyboard') return null;

        return (
            <div className='inline-keyboard'>
                {markup.rows.map(row => (
                    <div className='inline-keyboard-row'>
                        {row.map(cell => (
                            <Button
                                onClick={event => this.handleClick(event, cell)}
                                size='small'
                                variant='outlined'
                                fullWidth>
                                {cell.text}
                            </Button>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
}

InlineKeyboard.propTypes = {
    chatId: PropTypes.number,
    messageId: PropTypes.number
};

const enhance = compose(
    withStyles(styles, { withTheme: true }),
    withTranslation()
);

export default enhance(InlineKeyboard);
