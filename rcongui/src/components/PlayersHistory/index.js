/* eslint-disable no-use-before-define */
import React from 'react';
import useAutocomplete from '@material-ui/lab/useAutocomplete';
import { makeStyles } from '@material-ui/core/styles';
import { postData, showResponse } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import { join, each, reduce, get, map } from 'lodash'
import Autocomplete from "@material-ui/lab/Autocomplete";
import Pagination from '@material-ui/lab/Pagination';
import { Paper, Icon, Grid, Link, Divider, Popover, Badge, Button, TextField, FormControl, InputLabel, MenuItem, Select, FormControlLabel, Switch, LinearProgress, Chip } from '@material-ui/core'
import moment from 'moment'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons'
import { ReasonDialog } from "../PlayerView/playerActions";
import RefreshIcon from '@material-ui/icons/Refresh';
import MomentUtils from '@date-io/moment';
import { omitBy } from 'lodash/object'
import SearchBar from './searchBar'
import { Map, List } from 'immutable'
import FlagIcon from '@material-ui/icons/Flag';
import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { getEmojiFlag } from '../../utils/emoji'

const PlayerSummary = ({player, flag}) => (
    <React.Fragment>
        <p>Add flag: {flag ? getEmojiFlag(flag) : <small>Please choose</small>}</p>
        <p>To: {player.names ? player.names.map(n => <Chip label={n} />) : 'No name recorded'}</p>
        <p>Steamd id: {player.steam_id_64}</p>
    </React.Fragment>
)


class FlagDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            flag: null
        };
    }

    render() {
        const { open, handleClose, handleConfirm, SummaryRenderer } = this.props;
        const { flag } = this.state;

        return (
            <Dialog open={open} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">
                    <SummaryRenderer player={open} flag={flag} />
                </DialogTitle>
                <DialogContent>
                    <Picker onSelect={emoji => this.setState({ flag: emoji.native })} />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            this.setState({ flag: "" });
                            handleClose();
                        }}
                        color="primary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            handleConfirm(open, flag);
                            this.setState({ flag: "" });
                        }}
                        color="primary"
                    >
                        Confirm
                </Button>
                </DialogActions>
            </Dialog >
        );
    }
}

const show_names = (names) => (
    join(names, ' · ')
)

const WithPopver = ({ classes, popoverContent, children }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handlePopoverOpen = event => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <React.Fragment>
            <div onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}>
                {children}
            </div>
            <Popover
                id="mouse-over-popover"
                className={classes.popover}
                classes={{
                    paper: classes.paper,
                }}
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                {popoverContent}
            </Popover>
        </React.Fragment>
    );
}

const FlagButton = ({ classes, onflag }) => (<Button size="small" variant="outlined" onClick={onflag}><FlagIcon /></Button>)

const PlayerItem = ({ classes, names, steamId64, firstSeen, lastSeen, blacklisted, punish, kick, tempban, permaban, onBlacklist, onUnBlacklist, flags, onflag, onDeleteFlag, compact = true }) => {
    const now = moment()
    const last_seen = moment(lastSeen)
    const first_seen = moment(firstSeen)
    const extraneous = compact ? { display: 'none' } : {}

    return <Grid container>
        <Grid item xs={12}>
            <Paper>
                <Grid container justify="flex-start" alignItems="center" className={`${classes.doublePadding} ${classes.paddingBottom}`} style={{ paddingRight: 0 }}>
                    <Grid item xs={8} sm={7}>
                        <Grid container alignContent="flex-start">
                            <Grid item xs={12}>
                                <h4 style={{ display: "flex" }} className={`${classes.noPaddingMargin} ${classes.ellipsis}`}>
                                    {names}
                                </h4>
                            </Grid>
                            <Grid item xs={12}>
                                <small style={{ display: "flex" }}>
                                    <Link target="_blank" color="inherit" href={`${process.env.REACT_APP_API_URL}player?steam_id_64=${steamId64}`}>
                                        {steamId64}
                                    </Link>
                                </small>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={4} sm={5}>
                        {blacklisted
                            ? <Button variant="outlined" onClick={onUnBlacklist}>Unblacklist</Button>
                            : <Button variant="outlined" color="secondary" onClick={onBlacklist} >Blacklist <FontAwesomeIcon icon={faSkullCrossbones} /></Button>
                        }
                    </Grid>
                </Grid>
                <Grid container justify="space-around" alignContent="center" alignItems="center" spacing={0} style={extraneous} className={classes.padding}>
                    <Grid item xs={3}><FlagButton classes={classes} onflag={onflag} /></Grid>
                    <Grid item xs={9}>
                        <Grid container justify="flex-start" alignContent="center" alignItems="center" spacing={0} className={classes.paddingTop}>
                            {!flags || flags.isEmpty() ? 'No flags to display' : ''}
                            {flags.map(d =>
                                <Grid item className={classes.noPaddingMargin}><Link onClick={() => window.confirm("Delete flag?") ? onDeleteFlag(d.get('id')) : ''}>{getEmojiFlag(d.get('flag'))}</Link></Grid>
                            )}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid container justify="space-between" spacing={0} style={extraneous} className={classes.padding}>
                    <Grid item xs={6}>
                        <WithPopver classes={classes} popoverContent={<p>{first_seen.format('LLLL')}</p>}>
                            <small>First seen {moment.duration(now.diff(first_seen)).humanize()} ago</small>
                        </WithPopver>
                    </Grid>
                    <Grid item xs={6}>
                        <WithPopver classes={classes} popoverContent={<p>{last_seen.format('LLLL')}</p>}>
                            <small>Last seen {moment.duration(now.diff(last_seen)).humanize()} ago</small>
                        </WithPopver>
                    </Grid>
                    <Grid item xs={6}>
                        <small># Punish: {punish} </small>
                    </Grid>
                    <Grid item xs={6}>
                        <small># Kick: {kick} </small>
                    </Grid>
                    <Grid item xs={6}>
                        <small># Tempban: {tempban} </small>
                    </Grid>
                    <Grid item xs={6}>
                        <small># Permaban: {permaban} </small>
                    </Grid>
                </Grid>
            </Paper>
        </Grid>
    </Grid>
}

const MyPagination = ({ classes, pageSize, total, page, setPage }) => (

    <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(e, val) => setPage(val)}
        variant="outlined" color="default" showFirstButton showLastButton className={classes.pagination} />

)

const FilterPlayer = ({ classes, constPlayersHistory, pageSize, total, page, setPage, onUnBlacklist, onBlacklist, constNamesIndex, onAddFlag, onDeleteFlag }) => {

    const playersHistory = constPlayersHistory.toJS()
    const namesIndex = constNamesIndex.toJS()
    const {
        getRootProps,
        getInputLabelProps,
        getInputProps,
        getListboxProps,
        getOptionProps,
        groupedOptions,
    } = useAutocomplete({
        forcePopupIcon: true,
        freeSolo: true,
        selectOnFocus: true,
        blurOnSelect: false,
        disableOpenOnFocus: true,
        disableCloseOnSelect: true,
        disableClearable: true,
        disableListWrap: true,
        disableRestoreFocus: true,
        disablePortal: true,
        autoSelect: true,
        debug: true,
        options: namesIndex,
        getOptionLabel: option => option.names ? option.names : option,
    });

    const [doFlag, setDoFlag] = React.useState(false)
    const [doConfirmPlayer, setDoConfirmPlayer] = React.useState(false)
    const playerList = groupedOptions.length > 0 ? groupedOptions : namesIndex

    return (
        <div>
            <Grid container {...getRootProps()} alignContent="space-between" alignItems="flex-end" spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth inputProps={{ ...getInputProps() }} label="Filter current selection" />
                </Grid>
                <Grid item xs={12} md={6}>
                    <MyPagination classes={classes} pageSize={pageSize} page={page} setPage={setPage} total={total} />
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                {playerList.map(nameIndex => {
                    const player = playersHistory[nameIndex.idx]

                    return <Grid key={player.steam_id_64} item xs={12} sm={6} md={4} lg={3} xl={2}>
                        <PlayerItem
                            key={player.steam_id_64}
                            classes={classes}
                            names={show_names(player.names)}
                            steamId64={player.steam_id_64}
                            firstSeen={player.first_seen_timestamp_ms}
                            lastSeen={player.last_seen_timestamp_ms}
                            punish={player.penalty_count.PUNISH}
                            kick={player.penalty_count.KICK}
                            tempban={player.penalty_count.TEMPBAN}
                            permaban={player.penalty_count.PERMABAN}
                            compact={false}
                            blacklisted={player.blacklisted}
                            flags={List(player.flags.map(v => Map(v)))}
                            onflag={() => setDoFlag(player)}
                            onBlacklist={() => setDoConfirmPlayer({ player: player.steam_id_64, actionType: "blacklist" })}
                            onUnBlacklist={() => onUnBlacklist(player.steam_id_64)}
                            onDeleteFlag={onDeleteFlag}
                        />
                    </Grid>
                })}
                <Grid item xs={12}>
                    <MyPagination classes={classes} pageSize={pageSize} page={page} setPage={setPage} total={total} />
                </Grid>
            </Grid>
            <ReasonDialog
                open={doConfirmPlayer}
                handleClose={() => setDoConfirmPlayer(false)}
                handleConfirm={(actionType, steamId64, reason) => {
                    onBlacklist(steamId64, reason)
                    setDoConfirmPlayer(false);
                }}
            />
            <FlagDialog
                open={doFlag}
                handleClose={() => setDoFlag(false)}
                handleConfirm={(playerObj, theFlag) => {
                    onAddFlag(playerObj, theFlag, null)
                    setDoFlag(false);
                }}
                SummaryRenderer={PlayerSummary}
            />
        </div>
    );
}


class PlayersHistory extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            playersHistory: List(),
            namesIndex: List(),
            total: 0,
            pageSize: 50,
            page: 1,
            byName: "",
            bySteamId: "",
            blacklistedOnly: false,
            lastSeenFrom: null,
            lastSeenUntil: null,
            isLoading: true
        }

        this.getPlayerHistory = this.getPlayerHistory.bind(this)
        this.blacklistPlayer = this.blacklistPlayer.bind(this)
        this.unblacklistPlayer = this.unblacklistPlayer.bind(this)
        this.addFlagToPlayer = this.addFlagToPlayer.bind(this)
        this.deleteFlag = this.deleteFlag.bind(this)
    }

    getPlayerHistory() {
        const { pageSize, page, byName, bySteamId, blacklistedOnly, lastSeenFrom, lastSeenUntil } = this.state
        const params = omitBy({
            page_size: pageSize,
            page: page,
            player_name: byName,
            steam_id_64: bySteamId,
            blacklisted: blacklistedOnly,
            last_seen_from: lastSeenFrom,
            last_seen_until: lastSeenUntil,
        }, v => !v)

        this.setState({ isLoading: true })
        return postData(`${process.env.REACT_APP_API_URL}players_history`, params)
            .then(response => showResponse(response, 'player_history'))
            .then(data => {
                this.setState({ isLoading: false })
                if (data.failed) {
                    return
                }
                this.setState({
                    playersHistory: List(data.result.players),
                    namesIndex: List(data.result.players.map((el, idx) => ({ names: join(el.names, ','), idx: idx }))),
                    total: data.result.total,
                    pageSize: data.result.page_size,
                    page: data.result.page
                })
            })
            .catch(error => toast.error("Unable to connect to API " + error));
    }

    _reloadOnSuccess = data => {
        if (data.failed) {
            return
        }
        this.getPlayerHistory()
    }

    addFlagToPlayer(playerObj, flag, comment = null) {
        return postData(`${process.env.REACT_APP_API_URL}flag_player`, {
            steam_id_64: playerObj.steam_id_64, flag: flag, comment: comment
        })
            .then(response => showResponse(response, 'flag_player'))
            .then(this._reloadOnSuccess)
            .catch(error => toast.error("Unable to connect to API " + error));
    }

    deleteFlag(flag_id) {
        return postData(`${process.env.REACT_APP_API_URL}unflag_player`, {
            flag_id: flag_id
        })
            .then(response => showResponse(response, 'unflag_player'))
            .then(this._reloadOnSuccess)
            .catch(error => toast.error("Unable to connect to API " + error));
    }

    blacklistPlayer(steamId64, reason) {
        postData(`${process.env.REACT_APP_API_URL}blacklist_player`, {
            steam_id_64: steamId64,
            reason: reason
        })
            .then(response =>
                showResponse(
                    response,
                    `PlayerID ${steamId64} blacklist for ${reason}`,
                    true
                )
            ).then(this._reloadOnSuccess).catch(error => toast.error("Unable to connect to API " + error));
    }

    unblacklistPlayer(steamId64) {
        postData(`${process.env.REACT_APP_API_URL}unblacklist_player`, {
            steam_id_64: steamId64,
        })
            .then(response =>
                showResponse(
                    response,
                    `PlayerID ${steamId64} removed from blacklist`,
                    true
                )
            ).then(this._reloadOnSuccess).catch(error => toast.error("Unable to connect to API " + error));
    }


    componentDidMount() {
        this.getPlayerHistory()
    }

    render() {
        const { classes } = this.props
        const { playersHistory, pageSize, page, total, byName, bySteamId, blacklistedOnly, lastSeenFrom, lastSeenUntil, isLoading, namesIndex } = this.state


        // There's a bug in the autocomplete code, if there's a boolean in the object it makes it match against
        // "false" or "true" so essentially, everything matches to "F" or "T"
        // That's why we remap the list

        // Perfomance is crappy. It's less crappy after switcing to immutables but still...
        // It should be refactored so that the search bar does not trigger useless renderings
        return <Grid container className={classes.padding}>
            <Grid item xs={12}>
                <SearchBar
                    pageSize={pageSize} setPageSize={v => this.setState({ pageSize: v })}
                    lastSeenFrom={lastSeenFrom} setLastSeenFrom={v => this.setState({ lastSeenFrom: v })}
                    lastSeenUntil={lastSeenUntil} setLastSeenUntil={v => this.setState({ lastSeenUntil: v })}
                    name={byName} setName={v => this.setState({ byName: v })}
                    steamId={bySteamId} setSteamId={v => this.setState({ bySteamId: v })}
                    blacklistedOnly={blacklistedOnly} setBlacklistedOnly={v => this.setState({ blacklistedOnly: v })}
                    onSearch={this.getPlayerHistory}
                />
            </Grid>
            <Grid item xs={12}>
                {isLoading
                    ? <Grid item xs={12} className={classes.doublePadding}><LinearProgress color="secondary" /></Grid>
                    : <FilterPlayer
                        classes={classes}
                        constPlayersHistory={playersHistory}
                        constNamesIndex={namesIndex}
                        pageSize={pageSize}
                        total={total}
                        page={page}
                        setPage={(page) => this.setState({ page: page }, this.getPlayerHistory)}
                        onBlacklist={this.blacklistPlayer}
                        onUnBlacklist={this.unblacklistPlayer}
                        onAddFlag={this.addFlagToPlayer}
                        onDeleteFlag={this.deleteFlag}
                    />}
            </Grid>
        </Grid>
    }
}

export default PlayersHistory
export { FlagDialog, FlagButton, PlayersHistory }