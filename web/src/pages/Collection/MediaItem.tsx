import "./MediaItem.css";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import toast from "react-hot-toast";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import ItemCard from "../Home/ItemCard";

function MediaItem(props: any) {
  const queryClient = useQueryClient();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const handleDeleteClickOpen = () => {
    setMenuAnchor(null);
    setIsDeleteDialogOpen(true);
  };
  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteItem = () => {
    if (props.item) {
      var payload = {
        media_type: props.item.media_type,
        media_source: props.item.media_source,
        source_id: props.item.source_id,
      };
      axios
        .delete(`/api/v1/collection/${props.collectionID}`, { data: payload })
        .then(() => {
          setIsDeleteDialogOpen(false);
          queryClient.invalidateQueries({
            queryKey: ["collections", props.collectionID, "contents"],
          });
        })
        .catch((err) => {
          console.log(err);
          toast.error("Failed to remove item from collection");
          setIsDeleteDialogOpen(false);
        });
    }
  };
  return (
    <>
      <div className="collection-grid-item">
        <ItemCard item={props.item} itemType={"poster"} />
        {props.showDeleteButton ? (
          <IconButton
            className="collection-grid-item-more"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        ) : (
          ""
        )}
      </div>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleDeleteClickOpen}>
          Delete from collection
        </MenuItem>
      </Menu>
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete this item?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action cannot be reversed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteItem}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MediaItem;
