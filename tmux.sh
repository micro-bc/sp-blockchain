#!/bin/sh

SESSION="sp-blockchain"
T_CMD="node tracker.js"
N_CMD="npm start"

tmux has-session -t $SESSION &>/dev/null

if [ $? -ne 0 ]; then
    tmux new -d -s "$SESSION" "$N_CMD"
    tmux rename-window $SESSION

    tmux split-window -h $T_CMD
    tmux split-pane -h $N_CMD
    tmux select-layout even-horizontal
    tmux split-pane -v $N_CMD
    tmux select-pane -t 0
    tmux split-pane -v $N_CMD
    tmux select-pane -t 2
fi

tmux set-option -g mouse on
tmux set-option synchronize-panes on
tmux setw -g window-status-current-format '#{?pane_synchronized,#[bg=red],}#I:#W'
tmux setw -g window-status-format         '#{?pane_synchronized,#[bg=red],}#I:#W'
tmux bind C-y setw synchronize-panes

tmux -2 attach -t $SESSION
