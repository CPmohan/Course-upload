function IconButton(props) {
  return (
    <div
      onClick={props.onClick}
      className="flex gap-4 cursor-pointer h-max text-primary items-center p-1 px-3 bg-white border border-primary rounded-md hover:text-white hover:bg-primary"
    >
      <i className={`bx ${props.icon}`}></i>
      <button
        className={
          "w-full outline-none font-medium text-md tracking-wider" +
          props.margin
        }
      >
        {props.label}
      </button>
    </div>
  );
}

export default IconButton;
