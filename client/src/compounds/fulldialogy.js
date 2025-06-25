import { Backdrop, Box, Fade, Modal, Typography } from "@mui/material";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  borderRadius: "8px",
  bgcolor: "background.paper",
  boxShadow: 24,
  outline: "none",
  p: 2,
  overflow: "auto",
  maxHeight: "85vh" 
};

function CustomFullDialog(props) {
  return (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={props.open}
      onClose={props.handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={props.open}>
        <Box
          sx={props.style ? props.style : style}
          className="p-4 w-4/5 bg-white rounded-lg shadow-lg"
        >
          <div className="flex justify-between items-center">
            <Typography
              id="transition-modal-title"
              variant="h6"
              component="h2"
              className="text-lg font-semibold"
            >
              {props.title}
            </Typography>
            <div>{props.action}</div>
          </div>
          <div className="mt-4">
            {props.body}
          </div>
        </Box>
      </Fade>
    </Modal>
  );
}

export default CustomFullDialog;
