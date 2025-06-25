function LevelBadge(props){
    return <div>
        <div className="w-3 h-6 bg-primary" />
        <h2 className="bg-green w-max p-3 py-2 rounded-md font-medium text-white">{props.label.slice(0,1)}</h2>
    </div>
}

export default LevelBadge